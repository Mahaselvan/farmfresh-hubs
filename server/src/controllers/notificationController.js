const Notification = require("../models/Notification");
const { parseSafeLimit, parseSafeBoolean, parseSafeString, isValidObjectId } = require("../utils/validation");

const ALLOWED_NOTIFICATION_TYPES = [
  "BOOKING_CREATED",
  "LOT_UPDATED",
  "ORDER_CREATED",
  "ORDER_STATUS",
  "PAYMENT_SUCCESS",
  "ALERT"
];

const getNotifications = async (req, res) => {
  const { type, relatedId, limit, unreadOnly } = req.query;

  const filter = {};

  if (type !== undefined && type !== "") {
    const cleanType = parseSafeString(type, 50);
    if (!cleanType || !ALLOWED_NOTIFICATION_TYPES.includes(cleanType)) {
      return res.status(400).json({ success: false, message: "Invalid notification type" });
    }
    filter.type = cleanType;
  }

  if (relatedId !== undefined && relatedId !== "") {
    const cleanRelatedId = parseSafeString(relatedId, 64);
    if (!cleanRelatedId) {
      return res.status(400).json({ success: false, message: "Invalid relatedId" });
    }
    filter.relatedId = cleanRelatedId;
  }

  const unreadBool = parseSafeBoolean(unreadOnly);
  if (unreadBool === true) {
    filter.read = false;
  } else if (unreadBool === false) {
    filter.read = true;
  }

  if (req.user?.role !== "admin") {
    filter.$or = [{ userId: req.user._id }, { userId: null }];
  }

  const lim = parseSafeLimit(limit, 50, 200);
  const notes = await Notification.find(filter).sort({ createdAt: -1 }).limit(lim);

  const unreadCount = await Notification.countDocuments({ ...filter, read: false });

  res.json({ success: true, data: notes, meta: { unreadCount } });
};

const markAsRead = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid notification ID" });
  }

  const note = await Notification.findById(id);
  if (!note) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  if (req.user?.role !== "admin") {
    if (!note.userId || String(note.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
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
