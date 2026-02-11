const Hub = require("../models/Hub");
const Lot = require("../models/Lot");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");

const { makeLotId, makeLotQrString } = require("../utils/id");
const { SAFE_RANGES } = require("../constants/config");
const { isValidObjectId } = require("../utils/validateObjectId");
const { ensureDemoData } = require("../utils/bootstrapDemoData");

const COMMISSION_RATE = 0.07;
const LOGISTICS_FEE = 50; // demo flat fee

// ✅ CREATE LOT (Booking)
const createLot = async (req, res) => {
  try{const {
    farmerName,
    phone,
    village,
    crop,
    qtyKg,
    expectedPrice,
    hubId,
    storageDays
  } = req.body;

  if (
    !farmerName ||
    !phone ||
    !village ||
    !crop ||
    qtyKg == null ||
    expectedPrice == null ||
    !hubId ||
    storageDays == null
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields for booking"
    });
  }

  if (!isValidObjectId(hubId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid hubId. Please send a valid MongoDB ObjectId."
    });
  }

  const hub = await Hub.findById(hubId);
  if (!hub) {
    return res.status(404).json({
      success: false,
      message: "Hub not found"
    });
  }

  const qty = Number(qtyKg);
  const price = Number(expectedPrice);
  const days = Number(storageDays);

  if (Number.isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: "qtyKg must be a positive number" });
  }

  if (Number.isNaN(price) || price <= 0) {
    return res.status(400).json({ success: false, message: "expectedPrice must be a positive number" });
  }

  if (Number.isNaN(days) || days < 1 || days > 7) {
    return res.status(400).json({ success: false, message: "storageDays must be between 1 and 7" });
  }

  // Capacity check (demo)
  if (hub.currentUsedKg + qty > hub.capacityKg) {
    return res.status(400).json({
      success: false,
      message: "Hub capacity exceeded for this booking"
    });
  }
console.log("HUB DEBUG:", {
  hubId,
  currentUsedKg: hub.currentUsedKg,
  capacityKg: hub.capacityKg,
  qty
});

  const lotId = makeLotId();
  const qrString = makeLotQrString(lotId);

  const lot = await Lot.create({
    lotId,
    qrString,
    farmerName,
    phone,
    village,
    crop,
    qtyKg: qty,
    expectedPrice: price,
    hubId,
    storageDays: days,
    status: "RECEIVED",
    grade: "B",
    temp: 6,
    humidity: 70
  });

  // Update hub usage
  hub.currentUsedKg = Number(hub.currentUsedKg) + qty;
  await hub.save();

  // Advance = 50% of estimated value
  const estimatedValue = Number(lot.qtyKg) * Number(lot.expectedPrice);
  const advanceAmount = Math.round(estimatedValue * 0.5);

  await Payment.create({
    lotId: lot._id,
    advanceAmount,
    deductions: [],
    finalAmount: 0,
    settledAt: null
  });

  await Notification.create({
    type: "BOOKING_CREATED",
    message: `Booking created for ${crop} (${qty}kg) - ${lotId}`,
    relatedId: lot._id
  });

  return res.status(201).json({
    success: true,
    data: lot,
    meta: {
      advanceAmount,
      safeRanges: SAFE_RANGES
    }
  });
}
catch (err) {
    console.error("🔥 createLot error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

// ✅ GET LOTS (Dashboard list)
const getLots = async (req, res) => {
  await ensureDemoData();

  const { status, hubId, crop, q } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (hubId) filter.hubId = hubId;
  if (crop) filter.crop = crop;

  if (q) {
    filter.$or = [
      { lotId: { $regex: q, $options: "i" } },
      { farmerName: { $regex: q, $options: "i" } },
      { crop: { $regex: q, $options: "i" } },
      { village: { $regex: q, $options: "i" } }
    ];
  }

  const lots = await Lot.find(filter)
    .populate("hubId", "name location")
    .sort({ createdAt: -1 });

  return res.json({ success: true, data: lots });
};

// ✅ UPDATE LOT (status/temp/humidity/grade etc)
const updateLot = async (req, res) => {
  try {
    const { id } = req.params;

    const lot = await Lot.findById(id);
    if (!lot) {
      return res.status(404).json({ success: false, message: "Lot not found" });
    }

    const {
      status,
      grade,
      weightFinal,
      packingNotes,
      temp,
      humidity
    } = req.body;

    if (status) lot.status = status;
    if (grade) lot.grade = grade;

    if (weightFinal !== undefined) {
      const wf = weightFinal === null ? null : Number(weightFinal);
      if (wf !== null && (Number.isNaN(wf) || wf < 0)) {
        return res.status(400).json({
          success: false,
          message: "weightFinal must be >= 0 or null"
        });
      }
      lot.weightFinal = wf;
    }

    if (packingNotes !== undefined) {
      lot.packingNotes = String(packingNotes);
    }

    if (temp !== undefined) {
      const t = Number(temp);
      if (Number.isNaN(t)) {
        return res.status(400).json({ success: false, message: "temp must be a number" });
      }
      lot.temp = t;
    }

    if (humidity !== undefined) {
      const h = Number(humidity);
      if (Number.isNaN(h)) {
        return res.status(400).json({ success: false, message: "humidity must be a number" });
      }
      lot.humidity = h;
    }

    await lot.save();

    // 🔥 Settlement calculation when SOLD / SETTLED
    if (lot.status === "SOLD" || lot.status === "SETTLED") {
      const soldValue = Number(lot.qtyKg) * Number(lot.expectedPrice);
      const commission = Math.round(soldValue * COMMISSION_RATE);

      const deductions = [
        { label: "Commission (7%)", amount: commission },
        { label: "Logistics Fee", amount: LOGISTICS_FEE }
      ];

      const pay = await Payment.findOne({ lotId: lot._id });
      const advance = pay?.advanceAmount || 0;

      const finalAmount =
        soldValue - deductions.reduce((s, d) => s + d.amount, 0) - advance;

      await Payment.updateOne(
        { lotId: lot._id },
        {
          $set: {
            deductions,
            finalAmount,
            settledAt: lot.status === "SETTLED" ? new Date() : null
          }
        },
        { upsert: true }
      );
    }

    await Notification.create({
      type: "LOT_UPDATED",
      message: `Lot ${lot.lotId} updated (status: ${lot.status}, grade: ${lot.grade})`,
      relatedId: lot._id
    });

    return res.json({ success: true, data: lot });
  } catch (err) {
    console.error("🔥 updateLot error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
getLotById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Lot id required" });
    }

    const lot = await Lot.findById(id)
      .populate("hubId", "name location");

    if (!lot) {
      return res.status(404).json({ success: false, message: "Lot not found" });
    }

    return res.json({ success: true, data: lot });
  } catch (err) {
    console.error("getLotById error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch lot" });
  }
};
getFarmerLots = async (req, res) => {
  try {
    const { phone, q } = req.query;

    const filter = {};
    if (phone) filter.phone = String(phone).trim();

    // optional search by lotId/crop
    if (q) {
      const s = String(q).trim();
      filter.$or = [
        { lotId: { $regex: s, $options: "i" } },
        { crop: { $regex: s, $options: "i" } },
        { village: { $regex: s, $options: "i" } }
      ];
    }

    const lots = await Lot.find(filter)
      .populate("hubId", "name location")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: lots });
  } catch (err) {
    console.error("getFarmerLots error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch farmer lots" });
  }
};
getLotsByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone required" });
    }

    const lots = await Lot.find({ phone })
      .sort({ createdAt: -1 })
      .populate("hubId", "name location");

    return res.json({ success: true, data: lots });
  } catch (err) {
    console.error("getLotsByPhone error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch lots" });
  }
};
module.exports = {
  createLot,
  getLots,
  updateLot,
  getFarmerLots,
  getLotsByPhone,
  getLotById
};

