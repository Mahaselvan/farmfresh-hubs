const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    lotId: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: true },
    crop: { type: String, required: true, trim: true },
    qtyKg: { type: Number, required: true, min: 0 },
    pricePerKg: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [orderItemSchema], required: true },

    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    subtotalAmount: { type: Number, required: true, min: 0 },
    deliveryAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUND_PENDING", "REFUNDED", "REFUND_FAILED"],
      default: "PENDING",
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ["RAZORPAY"],
      default: "RAZORPAY"
    },
    razorpay: {
      orderId: { type: String, default: "" },
      paymentId: { type: String, default: "" },
      signature: { type: String, default: "" },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
      paidAt: { type: Date, default: null }
    },
    refund: {
      refundId: { type: String, default: "" },
      amount: { type: Number, default: 0 },
      status: { type: String, enum: ["NONE", "PROCESSING", "PENDING", "PROCESSED", "FAILED"], default: "NONE" },
      initiatedAt: { type: Date, default: null },
      processedAt: { type: Date, default: null },
      failedAt: { type: Date, default: null },
      leaseExpiresAt: { type: Date, default: null },
      reason: { type: String, default: "" },
      error: { type: String, default: "" }
    },

    status: {
      type: String,
      enum: ["PLACED", "CONFIRMED", "PACKING", "DISPATCHED", "DELIVERED", "CANCELLED"],
      default: "PLACED",
      index: true
    }
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
