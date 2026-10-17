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
const { requireAuth, requireRole } = require("../middleware/auth");
const { lotMutationLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/", requireAuth, requireRole("operator", "admin"), asyncHandler(getLots));
router.post("/", requireAuth, requireRole("farmer", "operator", "admin"), lotMutationLimiter, asyncHandler(createLot));
router.patch("/:id", requireAuth, requireRole("operator", "admin"), lotMutationLimiter, asyncHandler(updateLot));

router.get("/farmer/search", requireAuth, asyncHandler(getLotsByPhone));
router.get("/my", requireAuth, requireRole("farmer"), asyncHandler(getFarmerLots));
router.get("/farmer", requireAuth, requireRole("farmer"), asyncHandler(getFarmerLots));

router.get("/by-lotid/:lotId", asyncHandler(getLotByLotId));
router.get("/:id", requireAuth, asyncHandler(getLotById));

module.exports = router;
