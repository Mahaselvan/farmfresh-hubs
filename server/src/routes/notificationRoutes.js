const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const data = await Notification.find().sort({ createdAt: -1 }).limit(limit);
  res.json({ success: true, data });
});

module.exports = router;
