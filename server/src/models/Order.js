const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    lotId: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: true },
    qtyKg: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 } // per kg
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },

    items: { type: [orderItemSchema], required: true },

    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["PLACED", "CONFIRMED", "DISPATCHED", "DELIVERED", "CANCELLED"],
      default: "PLACED",
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
