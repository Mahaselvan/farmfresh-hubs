const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false, index: true },
    relatedId: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
