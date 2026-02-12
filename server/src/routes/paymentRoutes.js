const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const {
  getLotLedger,
  createRazorpayOrder,
  verifyRazorpayPayment
} = require("../controllers/paymentController");

router.get("/ledger/:lotId", asyncHandler(getLotLedger));
router.post("/create-order", asyncHandler(createRazorpayOrder));
router.post("/verify-payment", asyncHandler(verifyRazorpayPayment));

module.exports = router;
