const express = require("express");
const router = express.Router();
const Lot = require("../models/Lot");

router.get("/", async (req, res) => {
  const lots = await Lot.find().sort({ createdAt: -1 }).limit(200);

  const alerts = lots.filter((lot) => {
    const t = Number(lot.temp);
    const h = Number(lot.humidity);
    const tBad = Number.isFinite(t) && (t < 2 || t > 8);
    const hBad = Number.isFinite(h) && (h < 60 || h > 85);
    return tBad || hBad;
  });

  res.json({ success: true, data: alerts });
});

module.exports = router;
