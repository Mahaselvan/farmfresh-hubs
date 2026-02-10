const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // NO enum for MVP
  message: { type: String, required: true },
  relatedId: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", NotificationSchema);
