const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");

const {
  createLot,
  getLots,
  updateLot,
  getFarmerLots,
  getLotsByPhone,
  getLotById
} = require("../controllers/lotController");

const { getLotByLotId } = require("../controllers/lotLookupController");

const router = express.Router();

router.get("/", asyncHandler(getLots));
router.post("/", asyncHandler(createLot));
router.patch("/:id", asyncHandler(updateLot));

router.get("/farmer/search", asyncHandler(getLotsByPhone));
router.get("/farmer", asyncHandler(getFarmerLots));

router.get("/by-lotid/:lotId", asyncHandler(getLotByLotId));
router.get("/:id", asyncHandler(getLotById));

module.exports = router;
