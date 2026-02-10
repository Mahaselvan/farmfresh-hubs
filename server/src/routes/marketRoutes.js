const express = require("express");
const router = express.Router();
const {
  getMarketLots,
  getMarketLotById,
  getTrace
} = require("../controllers/marketController");
// Public marketplace endpoints
router.get("/lots", getMarketLots);
router.get("/lots/:lotId", getMarketLotById);
router.get("/trace/:lotId", getTrace);
module.exports = router;
