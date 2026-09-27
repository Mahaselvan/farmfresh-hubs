const Lot = require("../models/Lot");
const mongoose = require("mongoose");
const { ensureDemoData } = require("../utils/bootstrapDemoData");

const mapPublicLot = (lot) => ({
  _id: lot._id,
  lotId: lot.lotId,
  crop: lot.crop,
  village: lot.village,
  qtyKg: lot.remainingQtyKg,
  availableQtyKg: lot.remainingQtyKg,
  originalQtyKg: lot.originalQtyKg,
  expectedPrice: lot.expectedPrice,
  grade: lot.grade,
  status: lot.status,
  temp: lot.temp,
  humidity: lot.humidity,
  hubId: lot.hubId,
  events: lot.events || []
});

const getMarketLots = async (req, res) => {
  await ensureDemoData();

  const { crop, hubId, grade, minPrice, maxPrice, q } = req.query;

  const filter = { status: { $in: ["LISTED", "PARTIALLY_SOLD"] }, remainingQtyKg: { $gt: 0 } };

  if (crop) filter.crop = crop;
  if (hubId) filter.hubId = hubId;
  if (grade) filter.grade = grade;

  if (minPrice || maxPrice) {
    filter.expectedPrice = {};
    if (minPrice) filter.expectedPrice.$gte = Number(minPrice);
    if (maxPrice) filter.expectedPrice.$lte = Number(maxPrice);
  }

  if (q) {
    filter.$or = [{ crop: { $regex: q, $options: "i" } }, { lotId: { $regex: q, $options: "i" } }];
  }

  const lots = await Lot.find(filter).populate("hubId", "name location").sort({ createdAt: -1 });

  return res.json({ success: true, data: lots.map(mapPublicLot) });
};

const getMarketLotById = async (req, res) => {
  const { lotId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lotId)) {
    return res.status(400).json({ success: false, message: "Invalid lotId" });
  }

  const lot = await Lot.findById(lotId).populate("hubId", "name location");
  if (!lot) {
    return res.status(404).json({ success: false, message: "Lot not found" });
  }
  if (!["LISTED", "PARTIALLY_SOLD"].includes(lot.status)) {
    return res.status(404).json({ success: false, message: `Lot ${lot.lotId} is not available in marketplace` });
  }

  const timeline = (lot.events || []).map((e) => ({ type: e.type, at: e.timestamp, note: e.note })).sort((a, b) => new Date(a.at) - new Date(b.at));

  return res.json({ success: true, data: { lot: mapPublicLot(lot), timeline } });
};

const getTrace = async (req, res) => {
  try {
    const { lotId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(lotId)) {
      return res.status(400).json({ success: false, message: "Invalid lot id" });
    }

    const lot = await Lot.findById(lotId).populate("hubId", "name location");
    if (!lot) {
      return res.status(404).json({ success: false, message: "Lot not found" });
    }

    const timeline = (lot.events || []).map((event) => ({
      type: event.type,
      at: event.timestamp,
      note: event.note
    }));

    return res.json({
      success: true,
      data: {
        lot: {
          lotId: lot.lotId,
          crop: lot.crop,
          village: lot.village,
          grade: lot.grade,
          qtyKg: lot.originalQtyKg,
          availableQtyKg: lot.remainingQtyKg,
          status: lot.status,
          temp: lot.temp,
          humidity: lot.humidity,
          hub: lot.hubId
        },
        timeline
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Trace fetch failed" });
  }
};

module.exports = { getMarketLots, getMarketLotById, getTrace };
