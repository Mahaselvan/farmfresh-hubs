const express = require("express");
const router = express.Router();
const { getFarmerLotsByPhone } = require("../controllers/farmerController");

router.get("/lots", getFarmerLotsByPhone);

module.exports = router;
