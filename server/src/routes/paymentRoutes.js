const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const {
  getLotLedger,
  createRazorpayOrder,
  verifyRazorpayPayment
} = require("../controllers/paymentController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/ledger/:lotId", requireAuth, requireRole("farmer", "operator", "admin"), asyncHandler(getLotLedger));
router.post("/create-order", requireAuth, requireRole("consumer", "operator", "admin"), asyncHandler(createRazorpayOrder));
router.post("/verify-payment", requireAuth, requireRole("consumer", "operator", "admin"), asyncHandler(verifyRazorpayPayment));

module.exports = router;
