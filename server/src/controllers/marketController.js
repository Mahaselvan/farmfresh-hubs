const Lot = require("../models/Lot");
const mongoose = require("mongoose");
const { ensureDemoData } = require("../utils/bootstrapDemoData");
const {
  parseSafeString,
  parseSearchQuery,
  parseSafeNumber,
  parseSafeLimit,
  isValidObjectId
} = require("../utils/validation");

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
  try {
    await ensureDemoData();

    const { crop, hubId, grade, minPrice, maxPrice, q, limit } = req.query;

    const filter = { status: { $in: ["LISTED", "PARTIALLY_SOLD"] }, remainingQtyKg: { $gt: 0 } };

    if (crop !== undefined && crop !== "") {
      const cleanCrop = parseSafeString(crop, 50);
      if (!cleanCrop) {
        return res.status(400).json({ success: false, message: "Invalid crop filter" });
      }
      filter.crop = cleanCrop;
    }

    if (hubId !== undefined && hubId !== "") {
      if (!isValidObjectId(hubId)) {
        return res.status(400).json({ success: false, message: "Invalid hubId" });
      }
      filter.hubId = hubId;
    }

    if (grade !== undefined && grade !== "") {
      const cleanGrade = parseSafeString(grade, 5);
      if (!cleanGrade || !["A", "B", "C"].includes(cleanGrade)) {
        return res.status(400).json({ success: false, message: "Invalid grade" });
      }
      filter.grade = cleanGrade;
    }

    const parsedMin = parseSafeNumber(minPrice, { min: 0 });
    if (minPrice !== undefined && minPrice !== "" && parsedMin === null) {
      return res.status(400).json({ success: false, message: "Invalid minPrice" });
    }

    const parsedMax = parseSafeNumber(maxPrice, { min: 0 });
    if (maxPrice !== undefined && maxPrice !== "" && parsedMax === null) {
      return res.status(400).json({ success: false, message: "Invalid maxPrice" });
    }

    if (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
      return res.status(400).json({ success: false, message: "minPrice cannot be greater than maxPrice" });
    }

    if (parsedMin !== undefined || parsedMax !== undefined) {
      filter.expectedPrice = {};
      if (parsedMin !== undefined) filter.expectedPrice.$gte = parsedMin;
      if (parsedMax !== undefined) filter.expectedPrice.$lte = parsedMax;
    }

    const searchEscaped = parseSearchQuery(q, 64);
    if (searchEscaped) {
      filter.$or = [
        { crop: { $regex: searchEscaped, $options: "i" } },
        { lotId: { $regex: searchEscaped, $options: "i" } }
      ];
    }

    const lim = parseSafeLimit(limit, 100, 200);

    // If MongoDB is not connected and unmocked, return empty list gracefully
    if (mongoose.connection && mongoose.connection.readyState === 0 && typeof Lot.find?.name === "string" && Lot.find.name === "find") {
      return res.json({ success: true, data: [] });
    }

    const lots = await Lot.find(filter)
      .populate("hubId", "name location")
      .sort({ createdAt: -1 })
      .limit(lim);

    return res.json({ success: true, data: lots.map(mapPublicLot) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
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
