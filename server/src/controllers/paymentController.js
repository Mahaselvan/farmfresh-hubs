const Payment = require("../models/Payment");
const Lot = require("../models/Lot");
const Hub = require("../models/Hub");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { razorpay, hasCredentials } = require("../config/razorpay");

const findOrderByAnyId = async (id, session = null) => {
  if (String(id).startsWith("ORD-")) {
    return session ? Order.findOne({ orderId: id }).session(session) : Order.findOne({ orderId: id });
  }

  if (mongoose.isValidObjectId(id)) {
    return session ? Order.findById(id).session(session) : Order.findById(id);
  }

  return null;
};

exports.getLotLedger = async (req, res) => {
  const { lotId } = req.params;

  const lot = await Lot.findById(lotId).populate("hubId");
  if (!lot) {
    return res.status(404).json({ success: false, message: "Lot not found" });
  }

  if (req.user?.role === "farmer" && String(lot.farmerId) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
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
    if (!hasCredentials || !razorpay) {
      return res.status(500).json({ success: false, message: "Razorpay credentials are not configured" });
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    const order = await findOrderByAnyId(orderId);
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
      orderId: rpOrder.id
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

exports.verifyRazorpayPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment fields" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "Razorpay key secret is not configured" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    await session.withTransaction(async () => {
      const order = await findOrderByAnyId(orderId, session);
      if (!order) throw new Error("Order not found");

      if (req.user?.role === "consumer" && String(order.customerId) !== String(req.user._id)) {
        throw new Error("Forbidden");
      }

      if (order.razorpay?.orderId && order.razorpay.orderId !== razorpay_order_id) {
        throw new Error("Order id mismatch");
      }

      if (order.paymentStatus === "PAID") {
        return;
      }

      if (expectedSignature !== razorpay_signature) {
        order.paymentStatus = "FAILED";
        await order.save({ session });
        throw new Error("Invalid payment signature");
      }

      const lots = await Lot.find({ _id: { $in: order.items.map((it) => it.lotId) } }).session(session);
      const lotMap = new Map(lots.map((l) => [String(l._id), l]));

      for (const item of order.items) {
        const lot = lotMap.get(String(item.lotId));
        if (!lot) throw new Error("Lot not found during payment verification");

        const available = Number(lot.remainingQtyKg ?? 0);
        if (Number(item.qtyKg) > available) {
          throw new Error(`Insufficient inventory for ${lot.lotId}`);
        }

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
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
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
    });

    const updatedOrder = await findOrderByAnyId(orderId);

    return res.json({
      success: true,
      message: "Payment verified",
      data: {
        orderId: updatedOrder.orderId,
        paymentStatus: updatedOrder.paymentStatus,
        status: updatedOrder.status
      }
    });
  } catch (error) {
    if (String(error.message).toLowerCase().includes("forbidden")) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (String(error.message).includes("Invalid payment signature")) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
    if (String(error.message).includes("Insufficient inventory")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (String(error.message).includes("not found")) {
      return res.status(404).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};
