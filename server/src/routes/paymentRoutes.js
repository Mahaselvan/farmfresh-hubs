const express = require("express");
const router = express.Router();
const { getLotLedger } = require("../controllers/paymentController");

router.get("/ledger/:lotId", getLotLedger);

module.exports = router;
