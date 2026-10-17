const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  const { type, relatedId, limit, unreadOnly } = req.query;

  const filter = {};
  if (type) filter.type = type;
  if (relatedId) filter.relatedId = relatedId;
  if (unreadOnly === "true") filter.read = false;

  if (req.user?.role !== "admin") {
    filter.$or = [{ userId: req.user._id }, { userId: null }];
  }

  const lim = Math.min(Number(limit || 50), 200);
  const notes = await Notification.find(filter).sort({ createdAt: -1 }).limit(lim);

  const unreadCount = await Notification.countDocuments({ ...filter, read: false });

  res.json({ success: true, data: notes, meta: { unreadCount } });
};

const markAsRead = async (req, res) => {
  const { id } = req.params;

  const note = await Notification.findById(id);
  if (!note) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  if (req.user?.role !== "admin" && note.userId && String(note.userId) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  note.read = true;
  await note.save();

  return res.json({ success: true, data: note });
};

const markAllAsRead = async (req, res) => {
  const filter = req.user?.role === "admin" ? {} : { userId: req.user._id, read: false };
  await Notification.updateMany(filter, { $set: { read: true } });
  return res.json({ success: true, message: "Notifications marked as read" });
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
