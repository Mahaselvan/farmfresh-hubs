const mongoose = require("mongoose");

const hubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    capacityKg: { type: Number, required: true, min: 0 },
    currentUsedKg: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hub", hubSchema);
