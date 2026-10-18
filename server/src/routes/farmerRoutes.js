const express = require("express");
const router = express.Router();
const { getFarmerLotsByPhone } = require("../controllers/farmerController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/lots", requireAuth, requireRole("farmer"), getFarmerLotsByPhone);

module.exports = router;
