const mongoose = require("mongoose");
const Lot = require("../models/Lot");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const { makeOrderId } = require("../utils/id");

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { items, customerName, phone, address } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }
    if (!customerName || !phone || !address) {
      return res.status(400).json({ success: false, message: "Missing customer details" });
    }

    // Fetch all lots
    const lotIds = items.map((i) => i.lotId);
    const lots = await Lot.find({ _id: { $in: lotIds } });

    const lotMap = new Map(lots.map((l) => [String(l._id), l]));

    // Validate and compute total
    let totalAmount = 0;
    const orderItems = [];

    for (const it of items) {
      const lot = lotMap.get(String(it.lotId));
      const qtyKg = Number(it.qtyKg);

      if (!lot) {
        return res.status(404).json({ success: false, message: "One of the lots was not found" });
      }
      if (lot.status !== "LISTED") {
        return res.status(400).json({ success: false, message: `Lot ${lot.lotId} is not LISTED` });
      }
      if (!Number.isFinite(qtyKg) || qtyKg <= 0) {
        return res.status(400).json({ success: false, message: "Invalid quantity in cart" });
      }
      if (qtyKg > lot.qtyKg) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${lot.lotId}. Available: ${lot.qtyKg} kg`
        });
      }

      const price = Number(lot.expectedPrice);
      const lineTotal = qtyKg * price;
      totalAmount += lineTotal;

      orderItems.push({
        lotId: lot._id,
        qtyKg,
        price
      });
    }

    // Reduce stock + mark SOLD if qty becomes 0
    for (const it of orderItems) {
      const lot = lotMap.get(String(it.lotId));
      lot.qtyKg = Number(lot.qtyKg) - Number(it.qtyKg);

      if (lot.qtyKg <= 0) {
        lot.qtyKg = 0;
        lot.status = "SOLD";
      }

      await lot.save();
    }

    // Create order
    const orderId = makeOrderId();

    const order = await Order.create({
      orderId,
      items: orderItems,
      customerName,
      phone,
      address,
      totalAmount: Math.round(totalAmount),
      paymentStatus: "PENDING",
      paymentMethod: "RAZORPAY",
      status: "PLACED"
    });

    // Notification
    await Notification.create({
      type: "ORDER_CREATED",
      message: `Order placed ${orderId} (₹${order.totalAmount})`,
      relatedId: orderId
    });

    return res.status(201).json({
      success: true,
      data: order
    });
  } catch (err) {
    console.error("🔥 createOrder error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
getOrderAny = async (req, res) => {
  try {
    const { id } = req.params;

    // Case 1: orderId like ORD-XXXX
    if (String(id).startsWith("ORD-")) {
      const order = await Order.findOne({ orderId: id });
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      return res.json({ success: true, data: order });
    }

    // Case 2: Mongo ObjectId
    if (mongoose.isValidObjectId(id)) {
      const order = await Order.findById(id);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      return res.json({ success: true, data: order });
    }

    // Otherwise invalid
    return res.status(400).json({ success: false, message: "Invalid order id" });
  } catch (err) {
    console.error("getOrderAny error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};
// GET /api/orders/:orderId

const getOrderById = async (req, res) => {
  try {
    const id = req.params.orderId || req.params.id;

    // 1) Try find by orderId (ORD-XXXX)
    let order = await Order.findOne({ orderId: id }).populate("items.lotId");

    // 2) If not found, try Mongo ObjectId
    if (!order) {
      order = await Order.findById(id).populate("items.lotId");
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    console.log("🔥 getOrderById error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// GET /api/orders
const getAllOrders = async (req, res) => {
  const { status, limit } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const lim = Math.min(Number(limit || 50), 200);

  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(lim);

  return res.json({ success: true, data: orders });
};

// PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["PLACED", "CONFIRMED", "DISPATCHED", "DELIVERED", "CANCELLED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    let order = null;
    if (String(id).startsWith("ORD-")) {
      order = await Order.findOne({ orderId: id });
    } else if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
    } else {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.status = status;
    await order.save();

    await Notification.create({
      type: "ORDER_STATUS",
      message: `Order ${order.orderId} status updated to ${status}`,
      relatedId: order.orderId
    });

    return res.json({ success: true, data: order });
  } catch (err) {
    console.error("updateOrderStatus error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

module.exports = { createOrder, getOrderById, getOrderAny, getAllOrders, updateOrderStatus };
