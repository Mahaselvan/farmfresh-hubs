const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");

const {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require("../controllers/orderController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireRole("consumer", "admin", "operator"), asyncHandler(createOrder));
router.get("/", requireAuth, requireRole("consumer", "operator", "admin"), asyncHandler(getAllOrders));
router.get("/:orderId", requireAuth, requireRole("consumer", "operator", "admin"), asyncHandler(getOrderById));
router.patch("/:id/status", requireAuth, requireRole("operator", "admin"), asyncHandler(updateOrderStatus));

module.exports = router;
