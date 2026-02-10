const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  const { type, relatedId, limit } = req.query;

  const filter = {};
  if (type) filter.type = type;
  if (relatedId) filter.relatedId = relatedId;

  const lim = Math.min(Number(limit || 50), 200);

  const notes = await Notification.find(filter).sort({ createdAt: -1 }).limit(lim);

  res.json({ success: true, data: notes });
};

module.exports = { getNotifications };
