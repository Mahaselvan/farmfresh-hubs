const mongoose = require("mongoose");

const lotSchema = new mongoose.Schema(
  {
    lotId: { type: String, required: true, unique: true, index: true },
    qrString: { type: String, required: true },

    farmerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    village: { type: String, required: true, trim: true },

    crop: { type: String, required: true, trim: true },
    qtyKg: { type: Number, required: true, min: 0 },
    expectedPrice: { type: Number, required: true, min: 0 }, // per kg

    storageDays: { type: Number, required: true, min: 1, max: 7 },

   grade: { type: String, enum: ["A", "B", "C", null], default: null },
weightFinal: { type: Number, default: null },
packingNotes: { type: String, default: "" },
temp: { type: Number, default: null },
humidity: { type: Number, default: null },


    status: {
      type: String,
      enum: ["RECEIVED", "STORED", "LISTED", "SOLD", "SETTLED"],
      default: "RECEIVED",
      index: true
    },

    hubId: { type: mongoose.Schema.Types.ObjectId, ref: "Hub", required: true, index: true },

    // Hub operator editable
    finalWeightKg: { type: Number, default: null, min: 0 },
    packingNotes: { type: String, default: "", trim: true },

    // Demo sensor values
    temp: { type: Number, default: 6 }, // °C
    humidity: { type: Number, default: 70 } // %
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lot", lotSchema);
