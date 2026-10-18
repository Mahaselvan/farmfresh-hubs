const mongoose = require("mongoose");

const hubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    capacityKg: { type: Number, required: true, min: 0 },
    reservedKg: { type: Number, default: 0, min: 0 },
    storedKg: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

hubSchema.virtual("availableKg").get(function availableKg() {
  const capacity = Number(this.capacityKg || 0);
  const reserved = Number(this.reservedKg || 0);
  const stored = Number(this.storedKg || 0);
  return Math.max(0, capacity - reserved - stored);
});

module.exports = mongoose.model("Hub", hubSchema);
