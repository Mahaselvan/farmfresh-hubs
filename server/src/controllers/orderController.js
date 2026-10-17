const mongoose = require("mongoose");
const Lot = require("../models/Lot");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const { makeOrderId } = require("../utils/id");

const ORDER_FLOW = ["PLACED", "CONFIRMED", "PACKING", "DISPATCHED", "DELIVERED", "CANCELLED"];
const VALID_ORDER_TRANSITIONS = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKING", "CANCELLED"],
  PACKING: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: []
};

const canMoveOrderStatus = (from, to) => {
  if (!from || !to || from === to) return true;
  return VALID_ORDER_TRANSITIONS[from]?.includes(to) || false;
};

const mapOrderForResponse = (order) => {
  const plain = order.toObject ? order.toObject() : order;
  return {
    ...plain,
    items: (plain.items || []).map((it) => ({
      lotId: it.lotId?._id || it.lotId,
      lot: it.lotId && it.lotId.crop ? { _id: it.lotId._id, lotId: it.lotId.lotId, crop: it.lotId.crop } : undefined,
      crop: it.crop,
      qtyKg: it.qtyKg,
      pricePerKg: it.pricePerKg,
      total: it.total,
      price: it.pricePerKg
    }))
  };
};

const createOrder = async (req, res) => {
  try {
    const { items, customerName, phone, address } = req.body || {};

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!["consumer", "admin", "operator"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    if (!customerName || !phone || !address) {
      return res.status(400).json({ success: false, message: "Missing customer details" });
    }

    const mergedByLot = new Map();
    for (const item of items) {
      const lotId = String(item.lotId || "");
      const qty = Number(item.qtyKg);
      if (!mongoose.isValidObjectId(lotId) || !Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: "Invalid cart item" });
      }
      mergedByLot.set(lotId, Number(mergedByLot.get(lotId) || 0) + qty);
    }

    const lotIds = Array.from(mergedByLot.keys());
    const lots = await Lot.find({ _id: { $in: lotIds } });
    const lotMap = new Map(lots.map((l) => [String(l._id), l]));

    let subtotalAmount = 0;
    const orderItems = [];

    for (const [lotId, qtyKg] of mergedByLot.entries()) {
      const lot = lotMap.get(lotId);

      if (!lot) {
        return res.status(404).json({ success: false, message: "One of the products was not found" });
      }

      if (!["LISTED", "PARTIALLY_SOLD"].includes(lot.status)) {
        return res.status(400).json({ success: false, message: `${lot.lotId} is not available for sale` });
      }

      const availableQty = Number(lot.remainingQtyKg ?? lot.qtyKg ?? 0);
      if (qtyKg > availableQty) {
        return res.status(400).json({
          success: false,
          message: `Only ${availableQty} kg is currently available for ${lot.lotId}`
        });
      }

      const pricePerKg = Number(lot.expectedPrice);
      const total = Math.round(qtyKg * pricePerKg);
      subtotalAmount += total;

      orderItems.push({
        lotId: lot._id,
        crop: lot.crop,
        qtyKg,
        pricePerKg,
        total
      });
    }

    const orderId = makeOrderId();
    const order = await Order.create({
      orderId,
      customerId: req.user._id,
      items: orderItems,
      customerName,
      phone,
      address,
      subtotalAmount,
      deliveryAmount: 0,
      totalAmount: subtotalAmount,
      paymentStatus: "PENDING",
      paymentMethod: "RAZORPAY",
      status: "PLACED"
    });

    await Notification.create({
      userId: req.user._id,
      type: "ORDER_CREATED",
      title: "Order placed",
      message: `Your order ${orderId} has been placed.`,
      relatedId: orderId
    });

    return res.status(201).json({ success: true, data: mapOrderForResponse(order) });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const id = req.params.orderId || req.params.id;

    let order = await Order.findOne({ orderId: id }).populate("items.lotId", "lotId crop");
    if (!order && mongoose.isValidObjectId(id)) {
      order = await Order.findById(id).populate("items.lotId", "lotId crop");
    }

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (req.user?.role === "consumer" && String(order.customerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data: mapOrderForResponse(order) });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllOrders = async (req, res) => {
  const { status, limit, q } = req.query;

  const filter = {};
  if (status) filter.status = status;

  if (req.user?.role === "consumer") {
    filter.customerId = req.user._id;
  }

  if (q) {
    filter.$or = [
      { orderId: { $regex: q, $options: "i" } },
      { customerName: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } }
    ];
  }

  const lim = Math.min(Number(limit || 50), 200);
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(lim);

  return res.json({ success: true, data: orders.map(mapOrderForResponse) });
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!ORDER_FLOW.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    let order = null;
    if (String(id).startsWith("ORD-")) {
      order = await Order.findOne({ orderId: id });
    } else if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!canMoveOrderStatus(order.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status}`
      });
    }

    order.status = status;
    await order.save();

    await Notification.create({
      userId: order.customerId,
      type: "ORDER_STATUS",
      title: "Order status updated",
      message: `Your order ${order.orderId} is now ${status}.`,
      relatedId: order.orderId
    });

    return res.json({ success: true, data: mapOrderForResponse(order) });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
};

module.exports = { createOrder, getOrderById, getAllOrders, updateOrderStatus, mapOrderForResponse };
