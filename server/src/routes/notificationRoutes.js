const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { getNotifications, markAsRead, markAllAsRead } = require("../controllers/notificationController");

router.get("/", requireAuth, asyncHandler(getNotifications));
router.patch("/:id/read", requireAuth, asyncHandler(markAsRead));
router.patch("/read-all", requireAuth, asyncHandler(markAllAsRead));

module.exports = router;
