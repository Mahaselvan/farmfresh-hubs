const mongoose = require("mongoose");

const DeductionSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    amount: { type: Number, default: 0 }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    lotId: { type: mongoose.Schema.Types.ObjectId, ref: "Lot", required: true, unique: true, index: true },

    advanceAmount: { type: Number, required: true, min: 0 },

    deductions: {
  type: [
    {
      label: { type: String, required: true },
      amount: { type: Number, required: true }
    }
  ],
  default: []
},

    finalAmount: { type: Number, default: 0, min: 0 },
    settledAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
