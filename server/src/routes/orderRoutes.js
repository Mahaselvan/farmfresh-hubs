const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");

const {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require("../controllers/orderController");
console.log("ORDER HANDLERS:", {
  createOrder: typeof createOrder,
  getOrderById: typeof getOrderById,
  getAllOrders: typeof getAllOrders,
  updateOrderStatus: typeof updateOrderStatus
});

const router = express.Router();

// Create order
router.post("/", asyncHandler(createOrder));

// List orders (optional)
router.get("/", asyncHandler(getAllOrders));

// ✅ IMPORTANT: Order tracking by ORD-XXXX
router.get("/:orderId", asyncHandler(getOrderById));

// Update status (optional)
router.patch("/:id/status", asyncHandler(updateOrderStatus));

module.exports = router;
