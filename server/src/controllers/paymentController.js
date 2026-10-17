const Payment = require("../models/Payment");
const Lot = require("../models/Lot");
const Hub = require("../models/Hub");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { razorpay, hasCredentials } = require("../config/razorpay");
const { parseSafeString, isValidObjectId } = require("../utils/validation");

const findOrderByAnyId = async (id, session = null) => {
  if (typeof id !== "string") return null;
  const cleanId = id.trim();
  if (!cleanId || cleanId.length > 64) return null;

  if (cleanId.startsWith("ORD-")) {
    return session ? Order.findOne({ orderId: cleanId }).session(session) : Order.findOne({ orderId: cleanId });
  }

  if (isValidObjectId(cleanId)) {
    return session ? Order.findById(cleanId).session(session) : Order.findById(cleanId);
  }

  return null;
};

exports.getLotLedger = async (req, res) => {
  const { lotId } = req.params;

  if (!isValidObjectId(lotId)) {
    return res.status(400).json({ success: false, message: "Invalid lotId" });
  }

  const lot = await Lot.findById(lotId).populate("hubId");
  if (!lot) {
    return res.status(404).json({ success: false, message: "Lot not found" });
  }

  if (req.user?.role !== "admin" && req.user?.role !== "operator") {
    if (req.user?.role !== "farmer" || String(lot.farmerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
  }

  const payment = await Payment.findOne({ lotId: lot._id });

  const estimatedValue = Number(lot.originalQtyKg || lot.qtyKg) * Number(lot.expectedPrice || 0);
  const actualSaleValue = (lot.sales || []).reduce((sum, s) => sum + Number(s.total || 0), 0);

  return res.json({
    success: true,
    data: {
      lot: {
        _id: lot._id,
        lotId: lot.lotId,
        crop: lot.crop,
        farmerName: lot.farmerName,
        qtyKg: lot.qtyKg,
        originalQtyKg: lot.originalQtyKg,
        remainingQtyKg: lot.remainingQtyKg,
        expectedPrice: lot.expectedPrice,
        status: lot.status,
        hub: lot.hubId
      },
      estimatedValue,
      actualSaleValue,
      payment: payment || {
        lotId: lot._id,
        advanceAmount: 0,
        deductions: [],
        finalAmount: 0,
        settledAt: null
      }
    }
  });
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body || {};
    const cleanOrderId = parseSafeString(orderId, 64);
    if (!cleanOrderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    if (!hasCredentials || !razorpay) {
      return res.status(500).json({ success: false, message: "Razorpay credentials are not configured" });
    }

    const order = await findOrderByAnyId(cleanOrderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (req.user?.role === "consumer" && String(order.customerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ success: false, message: "Order already paid" });
    }

    const amountInPaise = Math.round(Number(order.totalAmount) * 100);
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      return res.status(400).json({ success: false, message: "Invalid order amount" });
    }

    const receipt = `receipt_${order.orderId}_${Date.now()}`;

    const rpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt
    });

    order.razorpay = {
      ...(order.razorpay || {}),
      orderId: rpOrder.id,
      amount: rpOrder.amount || amountInPaise,
      currency: rpOrder.currency || "INR"
    };
    await order.save();

    return res.json({
      success: true,
      data: {
        id: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        receipt: rpOrder.receipt,
        appOrderId: order.orderId
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const verifyHmacSignature = (expected, actual) => {
  if (typeof expected !== "string" || typeof actual !== "string") return false;
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(actual, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

exports.verifyHmacSignature = verifyHmacSignature;

const processOrReconcileRefund = async ({ order, cleanRpPaymentId, refundAmountPaise, exhaustedCrop }) => {
  let refundId = order.refund?.refundId || "";
  let refundStatus = order.refund?.status || "PENDING";
  let refundSuccess = false;
  let refundErrMsg = "";

  if (hasCredentials && razorpay) {
    // 1. Check if a refund already exists on Razorpay for this payment (idempotency guard)
    if (typeof razorpay.payments?.fetchMultipleRefund === "function") {
      try {
        const existingResp = await razorpay.payments.fetchMultipleRefund(cleanRpPaymentId);
        const items = existingResp?.items || (Array.isArray(existingResp) ? existingResp : []);
        const matching = items.find(
          (it) => it.id === refundId || it.notes?.orderId === order.orderId || Number(it.amount) === refundAmountPaise
        );
        if (matching) {
          refundId = matching.id;
          if (matching.status === "processed") {
            refundStatus = "PROCESSED";
            refundSuccess = true;
          } else if (matching.status === "pending") {
            refundStatus = "PENDING";
            refundSuccess = true;
          } else if (matching.status === "failed") {
            refundStatus = "FAILED";
            refundErrMsg = matching.error_description || "Refund reported failed by gateway";
          }
        }
      } catch (fetchErr) {
        // Continue to issuance if fetch encounters error and no refundId is assigned
      }
    }

    // 2. Concurrency-safe refund dispatch via atomic lease
    let leaseAcquired = false;
    if (!refundId && typeof razorpay.payments?.refund === "function") {
      const now = new Date();
      const leaseDurationMs = 60 * 1000;
      const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

      try {
        if (typeof Order.findOneAndUpdate === "function") {
          const leaseDoc = await Order.findOneAndUpdate(
            {
              _id: order._id,
              "refund.status": { $nin: ["PROCESSED", "PROCESSING"] },
              $or: [
                { "refund.leaseExpiresAt": null },
                { "refund.leaseExpiresAt": { $lt: now } }
              ]
            },
            {
              $set: {
                "refund.status": "PROCESSING",
                "refund.leaseExpiresAt": leaseExpiresAt
              }
            },
            { new: true }
          );

          if (leaseDoc) {
            leaseAcquired = true;
          } else {
            console.warn(`[Payment] Refund lease for order ${order.orderId} currently held by another worker. Skipping duplicate dispatch.`);
            return {
              type: "STOCK_EXHAUSTED",
              exhaustedCrop,
              refundSuccess: order.paymentStatus === "REFUNDED" || order.paymentStatus === "REFUND_PENDING",
              refundStatus: order.refund?.status || "PENDING",
              orderId: order.orderId,
              paymentStatus: order.paymentStatus,
              refund: order.refund
            };
          }
        } else {
          leaseAcquired = true;
        }
      } catch (leaseErr) {
        leaseAcquired = true;
      }
    }

    if (!refundId && leaseAcquired && typeof razorpay.payments?.refund === "function") {
      try {
        const refundResult = await razorpay.payments.refund(cleanRpPaymentId, {
          amount: refundAmountPaise,
          receipt: `rfnd_${order.orderId}`,
          notes: {
            reason: "STOCK_EXHAUSTED",
            orderId: order.orderId
          }
        });

        if (refundResult && refundResult.id) {
          refundId = refundResult.id;
          if (refundResult.status === "processed") {
            refundStatus = "PROCESSED";
            refundSuccess = true;
          } else if (refundResult.status === "pending") {
            refundStatus = "PENDING";
            refundSuccess = true;
          } else if (refundResult.status === "failed") {
            refundStatus = "FAILED";
            refundErrMsg = refundResult.error_description || "Refund reported failed by gateway";
          } else {
            refundStatus = "PROCESSED";
            refundSuccess = true;
          }
        } else {
          refundStatus = "FAILED";
          refundErrMsg = "Refund request was not acknowledged by gateway";
        }
      } catch (rErr) {
        refundStatus = "FAILED";
        refundErrMsg = rErr.message || "Refund API invocation failed";

        if (typeof rErr.message === "string" && rErr.message.toLowerCase().includes("already been refunded")) {
          refundStatus = "PROCESSED";
          refundSuccess = true;
          refundErrMsg = "";
        } else if (typeof razorpay.payments?.fetchMultipleRefund === "function") {
          try {
            const checkResp = await razorpay.payments.fetchMultipleRefund(cleanRpPaymentId);
            const items = checkResp?.items || (Array.isArray(checkResp) ? checkResp : []);
            const matching = items.find(
              (it) => it.notes?.orderId === order.orderId || Number(it.amount) === refundAmountPaise
            );
            if (matching) {
              refundId = matching.id;
              if (matching.status === "processed") {
                refundStatus = "PROCESSED";
                refundSuccess = true;
                refundErrMsg = "";
              } else if (matching.status === "pending") {
                refundStatus = "PENDING";
                refundSuccess = true;
                refundErrMsg = "";
              }
            }
          } catch (recheckErr) {
            // Retain FAILED
          }
        }
      }
    }
  } else {
    refundStatus = "FAILED";
    refundErrMsg = "Razorpay service client not available";
  }

  // 3. Map into order record
  if (refundStatus === "PROCESSED") {
    order.paymentStatus = "REFUNDED";
    order.refund = {
      refundId: refundId || `rfnd_${Date.now()}`,
      amount: refundAmountPaise / 100,
      status: "PROCESSED",
      initiatedAt: order.refund?.initiatedAt || new Date(),
      processedAt: new Date(),
      failedAt: null,
      leaseExpiresAt: null,
      reason: "STOCK_EXHAUSTED",
      error: ""
    };
  } else if (refundStatus === "PENDING") {
    order.paymentStatus = "REFUND_PENDING";
    order.refund = {
      refundId: refundId || `rfnd_${Date.now()}`,
      amount: refundAmountPaise / 100,
      status: "PENDING",
      initiatedAt: order.refund?.initiatedAt || new Date(),
      processedAt: null,
      failedAt: null,
      leaseExpiresAt: null,
      reason: "STOCK_EXHAUSTED",
      error: ""
    };
  } else {
    order.paymentStatus = "REFUND_FAILED";
    order.refund = {
      refundId: refundId || "",
      amount: 0,
      status: "FAILED",
      initiatedAt: order.refund?.initiatedAt || new Date(),
      processedAt: null,
      failedAt: new Date(),
      leaseExpiresAt: null,
      reason: "STOCK_EXHAUSTED",
      error: refundErrMsg
    };
  }

  await order.save();

  // 4. Create notification
  await Notification.create({
    userId: order.customerId,
    type: "ALERT",
    title: refundStatus === "PROCESSED"
      ? "Payment refunded"
      : refundStatus === "PENDING"
        ? "Refund in progress"
        : "Stock unavailable — Refund review required",
    message: refundStatus === "PROCESSED"
      ? `Stock exhausted for ${exhaustedCrop}. Payment for ${order.orderId} (₹${order.totalAmount}) has been automatically refunded.`
      : refundStatus === "PENDING"
        ? `Stock exhausted for ${exhaustedCrop}. A refund of ₹${order.totalAmount} for order ${order.orderId} has been initiated and is pending banking clearance.`
        : `Stock exhausted for ${exhaustedCrop} on order ${order.orderId}. Automatic refund could not be verified; operator will review and process refund manually.`,
    relatedId: order.orderId
  });

  return {
    type: "STOCK_EXHAUSTED",
    exhaustedCrop,
    refundSuccess: refundStatus === "PROCESSED" || refundStatus === "PENDING",
    refundStatus,
    orderId: order.orderId,
    paymentStatus: order.paymentStatus,
    refund: order.refund
  };
};

exports.processOrReconcileRefund = processOrReconcileRefund;

const reconcilePendingRefunds = async () => {
  if (!hasCredentials || !razorpay) return { reconciledCount: 0, errors: [] };

  try {
    const stuckOrders = await Order.find({
      paymentStatus: { $in: ["REFUND_PENDING", "REFUND_FAILED"] },
      "razorpay.paymentId": { $exists: true, $ne: "" }
    }).limit(50);

    let reconciledCount = 0;
    const errors = [];

    for (const ord of stuckOrders) {
      try {
        if (typeof razorpay.payments?.fetchMultipleRefund === "function") {
          const resp = await razorpay.payments.fetchMultipleRefund(ord.razorpay.paymentId);
          const items = resp?.items || (Array.isArray(resp) ? resp : []);
          const refundAmountPaise = Math.round(Number(ord.totalAmount) * 100);
          const matching = items.find(
            (it) => it.id === ord.refund?.refundId || it.notes?.orderId === ord.orderId || Number(it.amount) === refundAmountPaise
          );

          if (matching) {
            if (matching.status === "processed") {
              ord.paymentStatus = "REFUNDED";
              ord.refund.status = "PROCESSED";
              ord.refund.refundId = matching.id;
              ord.refund.processedAt = new Date();
              ord.refund.leaseExpiresAt = null;
              await ord.save();
              reconciledCount++;
            } else if (matching.status === "pending") {
              ord.paymentStatus = "REFUND_PENDING";
              ord.refund.status = "PENDING";
              ord.refund.refundId = matching.id;
              ord.refund.leaseExpiresAt = null;
              await ord.save();
              reconciledCount++;
            }
          }
        }
      } catch (err) {
        errors.push({ orderId: ord.orderId, error: err.message });
      }
    }

    return { reconciledCount, errors };
  } catch (outerErr) {
    console.error("[Payment] reconcilePendingRefunds error:", outerErr.message);
    return { reconciledCount: 0, errors: [outerErr.message] };
  }
};

exports.reconcilePendingRefunds = reconcilePendingRefunds;

exports.reconcileRefundsHandler = async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "operator") {
      return res.status(403).json({ success: false, message: "Forbidden: Admin or Operator only" });
    }
    const result = await reconcilePendingRefunds();
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    const cleanOrderId = parseSafeString(orderId, 64);
    const cleanRpOrderId = parseSafeString(razorpay_order_id, 128);
    const cleanRpPaymentId = parseSafeString(razorpay_payment_id, 128);
    const cleanRpSignature = parseSafeString(razorpay_signature, 256);

    if (!cleanOrderId || !cleanRpOrderId || !cleanRpPaymentId || !cleanRpSignature) {
      return res.status(400).json({ success: false, message: "Missing or invalid payment fields" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "Razorpay key secret is not configured" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${cleanRpOrderId}|${cleanRpPaymentId}`)
      .digest("hex");

    if (!verifyHmacSignature(expectedSignature, cleanRpSignature)) {
      const order = await findOrderByAnyId(cleanOrderId);
      if (order && order.paymentStatus !== "PAID") {
        order.paymentStatus = "FAILED";
        await order.save();
      }
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    let outcome = null;

    await session.withTransaction(async () => {
      const order = await findOrderByAnyId(cleanOrderId, session);
      if (!order) throw new Error("Order not found");

      if (req.user?.role === "consumer" && String(order.customerId) !== String(req.user._id)) {
        throw new Error("Forbidden");
      }

      if (!order.razorpay?.orderId || order.razorpay.orderId !== cleanRpOrderId) {
        throw new Error("Order id mismatch");
      }

      const expectedAmountPaise = Math.round(Number(order.totalAmount) * 100);
      if (req.body?.amount != null && Number(req.body.amount) !== expectedAmountPaise) {
        throw new Error("Payment amount mismatch");
      }

      if (req.body?.currency != null && String(req.body.currency).toUpperCase() !== "INR") {
        throw new Error("Payment currency mismatch");
      }

      if (razorpay && typeof razorpay.payments?.fetch === "function") {
        try {
          const remotePayment = await razorpay.payments.fetch(cleanRpPaymentId);
          if (remotePayment) {
            if (remotePayment.order_id && remotePayment.order_id !== cleanRpOrderId) {
              throw new Error("Order id mismatch");
            }
            if (remotePayment.amount != null && Number(remotePayment.amount) !== expectedAmountPaise) {
              throw new Error("Payment amount mismatch");
            }
            if (remotePayment.currency && String(remotePayment.currency).toUpperCase() !== "INR") {
              throw new Error("Payment currency mismatch");
            }
          }
        } catch (fetchErr) {
          if (fetchErr.message && fetchErr.message.includes("mismatch")) {
            throw fetchErr;
          }
        }
      }

      if (order.paymentStatus === "PAID") {
        outcome = {
          type: "ALREADY_PAID",
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          status: order.status
        };
        return;
      }

      if (order.paymentStatus === "REFUNDED") {
        outcome = {
          type: "ALREADY_REFUNDED",
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          status: order.status,
          refund: order.refund
        };
        return;
      }

      if (order.status === "CANCELLED" || ["REFUND_PENDING", "REFUND_FAILED"].includes(order.paymentStatus)) {
        outcome = {
          type: "CANCELLED_OR_PENDING_REPLAY",
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          status: order.status,
          refund: order.refund,
          cleanRpPaymentId,
          refundAmountPaise: expectedAmountPaise,
          exhaustedCrop: order.items[0]?.crop || "produce"
        };
        return;
      }

      const lots = await Lot.find({ _id: { $in: order.items.map((it) => it.lotId) } }).session(session);
      const lotMap = new Map(lots.map((l) => [String(l._id), l]));

      let stockExhausted = false;
      let exhaustedCrop = "";

      for (const item of order.items) {
        const lot = lotMap.get(String(item.lotId));
        const available = Number(lot?.remainingQtyKg ?? 0);
        if (!lot || Number(item.qtyKg) > available) {
          stockExhausted = true;
          exhaustedCrop = lot ? lot.crop : "produce";
          break;
        }
      }

      if (stockExhausted) {
        const refundAmountPaise = expectedAmountPaise;
        order.razorpay = {
          orderId: cleanRpOrderId,
          paymentId: cleanRpPaymentId,
          signature: cleanRpSignature,
          amount: refundAmountPaise,
          currency: "INR",
          paidAt: new Date()
        };
        order.status = "CANCELLED";
        order.paymentStatus = "REFUND_PENDING";
        order.refund = {
          refundId: order.refund?.refundId || "",
          amount: refundAmountPaise / 100,
          status: "PENDING",
          initiatedAt: order.refund?.initiatedAt || new Date(),
          processedAt: null,
          failedAt: null,
          reason: "STOCK_EXHAUSTED",
          error: ""
        };

        await order.save({ session });

        outcome = {
          type: "STOCK_EXHAUSTED_NEEDS_REFUND",
          exhaustedCrop,
          orderId: order.orderId,
          cleanRpPaymentId,
          refundAmountPaise
        };
        return;
      }

      for (const item of order.items) {
        const lot = lotMap.get(String(item.lotId));
        const available = Number(lot.remainingQtyKg ?? 0);

        lot.remainingQtyKg = available - Number(item.qtyKg);
        lot.qtyKg = lot.remainingQtyKg;

        lot.sales.push({
          orderId: order.orderId,
          qtyKg: Number(item.qtyKg),
          pricePerKg: Number(item.pricePerKg),
          total: Number(item.total),
          soldAt: new Date()
        });

        if (lot.remainingQtyKg <= 0) {
          lot.remainingQtyKg = 0;
          lot.status = "SOLD";
          lot.events.push({ type: "SOLD", note: `Sold via order ${order.orderId}` });
        } else {
          lot.status = "PARTIALLY_SOLD";
          lot.events.push({ type: "PARTIALLY_SOLD", note: `Partial sale via order ${order.orderId}` });
        }

        await lot.save({ session });

        await Hub.updateOne(
          { _id: lot.hubId },
          { $inc: { storedKg: -Number(item.qtyKg) } },
          { session }
        );
      }

      order.paymentStatus = "PAID";
      order.status = "CONFIRMED";
      order.razorpay = {
        orderId: cleanRpOrderId,
        paymentId: cleanRpPaymentId,
        signature: cleanRpSignature,
        amount: expectedAmountPaise,
        currency: "INR",
        paidAt: new Date()
      };
      await order.save({ session });

      await Notification.create([
        {
          userId: order.customerId,
          type: "PAYMENT_SUCCESS",
          title: "Payment successful",
          message: `Payment received for ${order.orderId} (₹${order.totalAmount}).`,
          relatedId: order.orderId
        }
      ], { session });

      outcome = {
        type: "SUCCESS",
        orderId: order.orderId,
        paymentStatus: "PAID",
        status: "CONFIRMED"
      };
    });

    if (outcome?.type === "STOCK_EXHAUSTED_NEEDS_REFUND") {
      const order = await findOrderByAnyId(cleanOrderId);
      const refundRes = await processOrReconcileRefund({
        order,
        cleanRpPaymentId: outcome.cleanRpPaymentId,
        refundAmountPaise: outcome.refundAmountPaise,
        exhaustedCrop: outcome.exhaustedCrop
      });

      return res.status(409).json({
        success: false,
        code: "STOCK_EXHAUSTED",
        message: `Insufficient inventory for ${outcome.exhaustedCrop}. Payment was captured and ${refundRes.refundStatus === "PROCESSED" ? "has been automatically refunded" : refundRes.refundStatus === "PENDING" ? "refund is in progress" : "refund is pending manual reconciliation"}.`,
        data: {
          orderId: refundRes.orderId,
          paymentStatus: refundRes.paymentStatus,
          refund: refundRes.refund
        }
      });
    }

    if (outcome?.type === "CANCELLED_OR_PENDING_REPLAY") {
      if (outcome.paymentStatus === "REFUND_PENDING" || outcome.paymentStatus === "REFUND_FAILED") {
        const order = await findOrderByAnyId(cleanOrderId);
        const refundRes = await processOrReconcileRefund({
          order,
          cleanRpPaymentId: outcome.cleanRpPaymentId,
          refundAmountPaise: outcome.refundAmountPaise,
          exhaustedCrop: outcome.exhaustedCrop
        });

        return res.status(409).json({
          success: false,
          code: "STOCK_EXHAUSTED",
          message: `Order was cancelled due to stock exhaustion. ${refundRes.refundStatus === "PROCESSED" ? "Payment has been automatically refunded" : refundRes.refundStatus === "PENDING" ? "Refund is in progress" : "Refund is pending manual reconciliation"}.`,
          data: {
            orderId: refundRes.orderId,
            paymentStatus: refundRes.paymentStatus,
            refund: refundRes.refund
          }
        });
      }

      return res.status(409).json({
        success: false,
        code: "STOCK_EXHAUSTED",
        message: "Order was cancelled and payment cannot be confirmed.",
        data: {
          orderId: outcome.orderId,
          paymentStatus: outcome.paymentStatus,
          refund: outcome.refund
        }
      });
    }

    if (outcome?.type === "ALREADY_REFUNDED") {
      return res.status(409).json({
        success: false,
        code: "STOCK_EXHAUSTED",
        message: "Payment was already refunded due to stock exhaustion.",
        data: {
          orderId: outcome.orderId,
          paymentStatus: outcome.paymentStatus,
          refund: outcome.refund
        }
      });
    }

    return res.json({
      success: true,
      message: "Payment verified",
      data: {
        orderId: outcome ? outcome.orderId : cleanOrderId,
        paymentStatus: outcome ? outcome.paymentStatus : "PAID",
        status: outcome ? outcome.status : "CONFIRMED"
      }
    });
  } catch (error) {
    if (String(error.message).toLowerCase().includes("forbidden")) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (String(error.message).includes("mismatch")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (String(error.message).includes("Invalid payment signature")) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
    if (String(error.message).includes("not found")) {
      return res.status(404).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};
