const Lot = require("../models/Lot");
const mongoose = require("mongoose");

// GET /api/market/lots
// Public: only LISTED lots, with search + filters
const getMarketLots = async (req, res) => {
  const { crop, hubId, grade, minPrice, maxPrice, q } = req.query;

  const filter = { status: "LISTED" };

  if (crop) filter.crop = crop;
  if (hubId) filter.hubId = hubId;
  if (grade) filter.grade = grade;

  if (minPrice || maxPrice) {
    filter.expectedPrice = {};
    if (minPrice) filter.expectedPrice.$gte = Number(minPrice);
    if (maxPrice) filter.expectedPrice.$lte = Number(maxPrice);
  }

  if (q) {
    filter.$or = [
      { crop: { $regex: q, $options: "i" } },
      { lotId: { $regex: q, $options: "i" } }
    ];
  }

  const lots = await Lot.find(filter)
    .populate("hubId", "name location")
    .sort({ createdAt: -1 });

  return res.json({ success: true, data: lots });
};

// GET /api/market/lots/:lotId
// Public: details + traceability timeline
const getMarketLotById = async (req, res) => {
  const { lotId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lotId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lotId"
    });
  }

  const lot = await Lot.findById(lotId).populate("hubId", "name location");
  if (!lot) {
    return res.status(404).json({ success: false, message: "Lot not found" });
  }

  const timeline = [
    {
      step: "FARM",
      at: lot.createdAt,
      note: `${lot.farmerName} booked ${lot.crop} (${lot.qtyKg}kg)`
    },
    {
      step: "HUB",
      at: lot.createdAt,
      note: `Assigned to hub: ${lot.hubId?.name || "Hub"}`
    },
    {
      step: "STORAGE",
      at: lot.updatedAt,
      note: `Current status: ${lot.status}`
    }
  ];

  return res.json({ success: true, data: { lot, timeline } });
};
getTrace = async (req, res) => {
  try {
    const { lotId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(lotId)) {
      return res.status(400).json({ success: false, message: "Invalid lot id" });
    }

    const lot = await Lot.findById(lotId).populate("hubId", "name location");
    if (!lot) {
      return res.status(404).json({ success: false, message: "Lot not found" });
    }

    // ✅ timeline steps (demo-ready)
    const timeline = [
      {
        step: "FARM",
        at: lot.createdAt,
        note: `${lot.farmerName} booked ${lot.crop} from ${lot.village}`
      },
      {
        step: "HUB",
        at: lot.createdAt,
        note: `Assigned to hub: ${lot.hubId?.name || "Hub"}`
      },
      {
        step: "STORAGE",
        at: lot.updatedAt,
        note: `Temp: ${lot.temp ?? "—"}°C, Humidity: ${lot.humidity ?? "—"}%`
      },
      {
        step: "STATUS",
        at: lot.updatedAt,
        note: `Current status: ${lot.status}`
      }
    ];

    return res.json({ success: true, data: { lot, timeline } });
  } catch (err) {
    console.error("getTrace error:", err.message);
    return res.status(500).json({ success: false, message: "Trace fetch failed" });
  }
};


module.exports = { getMarketLots, getMarketLotById, getTrace };
