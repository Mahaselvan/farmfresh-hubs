const mongoose = require("mongoose");

const traceEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["BOOKED", "RECEIVED_AT_HUB", "STORED", "LISTED", "PARTIALLY_SOLD", "SOLD", "SETTLED"],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, trim: true },
    qtyKg: { type: Number, required: true, min: 0 },
    pricePerKg: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    soldAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const lotSchema = new mongoose.Schema(
  {
    lotId: { type: String, required: true, unique: true, index: true },
    qrString: { type: String, required: true },

    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    farmerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    village: { type: String, required: true, trim: true },

    crop: { type: String, required: true, trim: true },
    qtyKg: { type: Number, required: true, min: 0 },
    originalQtyKg: { type: Number, required: true, min: 0 },
    remainingQtyKg: { type: Number, required: true, min: 0, index: true },
    expectedPrice: { type: Number, required: true, min: 0 },

    storageDays: { type: Number, required: true, min: 1, max: 7 },

    grade: { type: String, enum: ["A", "B", "C", null], default: null },
    finalWeightKg: { type: Number, default: null, min: 0 },
    packingNotes: { type: String, default: "", trim: true },
    temp: { type: Number, default: 6 },
    humidity: { type: Number, default: 70 },

    status: {
      type: String,
      enum: ["RECEIVED", "STORED", "LISTED", "PARTIALLY_SOLD", "SOLD", "SETTLED"],
      default: "RECEIVED",
      index: true
    },

    hubId: { type: mongoose.Schema.Types.ObjectId, ref: "Hub", required: true, index: true },

    sales: { type: [saleSchema], default: [] },
    events: { type: [traceEventSchema], default: [] }
  },
  { timestamps: true }
);

lotSchema.index({ farmerId: 1, createdAt: -1 });
lotSchema.index({ status: 1, crop: 1 });

module.exports = mongoose.model("Lot", lotSchema);
