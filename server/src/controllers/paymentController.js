const Payment = require("../models/Payment");
const Lot = require("../models/Lot");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { razorpay, hasCredentials } = require("../config/razorpay");

exports.getLotLedger = async (req, res) => {
  const { lotId } = req.params;

  const lot = await Lot.findById(lotId).populate("hubId");
  if (!lot) {
    return res.status(404).json({ success: false, message: "Lot not found" });
  }

  const payment = await Payment.findOne({ lotId: lot._id });

  const estimatedValue = Number(lot.qtyKg) * Number(lot.expectedPrice);

  return res.json({
    success: true,
    data: {
      lot: {
        _id: lot._id,
        lotId: lot.lotId,
        crop: lot.crop,
        farmerName: lot.farmerName,
        qtyKg: lot.qtyKg,
        expectedPrice: lot.expectedPrice,
        status: lot.status,
        hub: lot.hubId
      },
      estimatedValue,
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

const findOrderByAnyId = async (id) => {
  if (String(id).startsWith("ORD-")) {
    return Order.findOne({ orderId: id });
  }

  if (mongoose.isValidObjectId(id)) {
    return Order.findById(id);
  }

  return null;
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    if (!hasCredentials || !razorpay) {
      return res.status(500).json({
        success: false,
        message: "Razorpay credentials are not configured"
      });
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    const order = await findOrderByAnyId(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
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
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment fields" });
    }

    const order = await findOrderByAnyId(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay key secret is not configured"
      });
    }

    if (order.razorpay?.orderId && order.razorpay.orderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order id mismatch" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      order.paymentStatus = "FAILED";
      await order.save();
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    order.paymentStatus = "PAID";
    order.razorpay = {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      paidAt: new Date()
    };
    await order.save();

    await Notification.create({
      type: "PAYMENT_SUCCESS",
      message: `Payment received for ${order.orderId} (₹${order.totalAmount})`,
      relatedId: order.orderId
    });

    return res.json({
      success: true,
      message: "Payment verified",
      data: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
