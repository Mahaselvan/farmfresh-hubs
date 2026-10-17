const Hub = require("../models/Hub");
const Lot = require("../models/Lot");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");

const { makeLotId, makeLotQrString } = require("../utils/id");
const { SAFE_RANGES } = require("../constants/config");
const { isValidObjectId } = require("../utils/validateObjectId");
const { ensureDemoData } = require("../utils/bootstrapDemoData");

const COMMISSION_RATE = 0.07;
const LOGISTICS_FEE = 50;

const LOT_STATUS_FLOW = ["RECEIVED", "STORED", "LISTED", "PARTIALLY_SOLD", "SOLD", "SETTLED"];
const VALID_TRANSITIONS = {
  RECEIVED: ["STORED"],
  STORED: ["LISTED"],
  LISTED: ["PARTIALLY_SOLD", "SOLD"],
  PARTIALLY_SOLD: ["SOLD"],
  SOLD: ["SETTLED"],
  SETTLED: []
};

const toEventType = (status) => {
  const map = {
    RECEIVED: "RECEIVED_AT_HUB",
    STORED: "STORED",
    LISTED: "LISTED",
    PARTIALLY_SOLD: "PARTIALLY_SOLD",
    SOLD: "SOLD",
    SETTLED: "SETTLED"
  };
  return map[status] || "RECEIVED_AT_HUB";
};

const canTransition = (from, to) => {
  if (!from || !to || from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) || false;
};

const createLot = async (req, res) => {
  try {
    const { village, crop, qtyKg, expectedPrice, hubId, storageDays } = req.body || {};

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!["farmer", "operator", "admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (!village || !crop || qtyKg == null || expectedPrice == null || !hubId || storageDays == null) {
      return res.status(400).json({ success: false, message: "Missing required fields for booking" });
    }

    if (!isValidObjectId(hubId)) {
      return res.status(400).json({ success: false, message: "Invalid hubId" });
    }

    const qty = Number(qtyKg);
    const price = Number(expectedPrice);
    const days = Number(storageDays);

    if (Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });
    }
    if (Number.isNaN(price) || price <= 0) {
      return res.status(400).json({ success: false, message: "Expected price must be greater than 0" });
    }
    if (Number.isNaN(days) || days < 1 || days > 7) {
      return res.status(400).json({ success: false, message: "Storage duration must be between 1 and 7 days" });
    }

    const hub = await Hub.findById(hubId);
    if (!hub) {
      return res.status(404).json({ success: false, message: "Hub not found" });
    }

    const availableKg = Math.max(0, Number(hub.capacityKg) - Number(hub.reservedKg || 0) - Number(hub.storedKg || 0));
    if (qty > availableKg) {
      return res.status(400).json({ success: false, message: `Not enough space available. Available: ${availableKg} kg` });
    }

    const lotId = makeLotId();
    const qrString = makeLotQrString(lotId);

    const farmerName = req.user.name || req.body.farmerName || "Farmer";
    const phone = req.user.phone || req.body.phone || "";

    const lot = await Lot.create({
      lotId,
      qrString,
      farmerId: req.user._id,
      farmerName,
      phone,
      village: String(village).trim(),
      crop: String(crop).trim(),
      qtyKg: qty,
      originalQtyKg: qty,
      remainingQtyKg: qty,
      expectedPrice: price,
      hubId,
      storageDays: days,
      status: "RECEIVED",
      grade: null,
      temp: 6,
      humidity: 70,
      events: [
        { type: "BOOKED", note: `Booking confirmed for ${qty} kg ${crop}` },
        { type: "RECEIVED_AT_HUB", note: `Received at ${hub.name}` }
      ]
    });

    hub.storedKg = Number(hub.storedKg || 0) + qty;
    await hub.save();

    const estimatedValue = qty * price;
    const advanceAmount = Math.round(estimatedValue * 0.5);

    await Payment.updateOne(
      { lotId: lot._id },
      {
        $setOnInsert: {
          lotId: lot._id,
          advanceAmount,
          deductions: [],
          finalAmount: 0,
          settledAt: null
        }
      },
      { upsert: true }
    );

    await Notification.create({
      userId: req.user._id,
      type: "BOOKING_CREATED",
      title: "Booking confirmed",
      message: `Your ${crop} booking ${lotId} has been received.`,
      relatedId: lot._id.toString()
    });

    return res.status(201).json({
      success: true,
      data: lot,
      meta: {
        advanceAmount,
        safeRanges: SAFE_RANGES,
        hubCapacity: {
          capacityKg: hub.capacityKg,
          availableKg: Math.max(0, Number(hub.capacityKg) - Number(hub.reservedKg || 0) - Number(hub.storedKg || 0))
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

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

  const lots = await Lot.find(filter).populate("hubId", "name location capacityKg reservedKg storedKg").sort({ createdAt: -1 });
  return res.json({ success: true, data: lots });
};

const updateLot = async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await Lot.findById(id);

    if (!lot) {
      return res.status(404).json({ success: false, message: "Lot not found" });
    }

    const { status, grade, finalWeightKg, packingNotes, temp, humidity } = req.body || {};

    if (status && !LOT_STATUS_FLOW.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid lot status" });
    }

    if (status && !canTransition(lot.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${lot.status} to ${status}`
      });
    }

    if (grade !== undefined) lot.grade = grade;

    if (finalWeightKg !== undefined) {
      const fw = finalWeightKg === null ? null : Number(finalWeightKg);
      if (fw !== null && (Number.isNaN(fw) || fw < 0)) {
        return res.status(400).json({ success: false, message: "Final weight must be a positive number" });
      }
      lot.finalWeightKg = fw;
    }

    if (packingNotes !== undefined) lot.packingNotes = String(packingNotes || "");

    if (temp !== undefined) {
      const t = Number(temp);
      if (Number.isNaN(t)) return res.status(400).json({ success: false, message: "Temperature must be numeric" });
      lot.temp = t;
    }

    if (humidity !== undefined) {
      const h = Number(humidity);
      if (Number.isNaN(h)) return res.status(400).json({ success: false, message: "Humidity must be numeric" });
      lot.humidity = h;
    }

    if (status && lot.status !== status) {
      lot.status = status;
      lot.events.push({ type: toEventType(status), note: `Status updated to ${status}` });
    }

    if (lot.status === "SETTLED") {
      const grossSale = (lot.sales || []).reduce((sum, s) => sum + Number(s.total || 0), 0);
      const commission = Math.round(grossSale * COMMISSION_RATE);
      const deductions = [
        { label: "Commission (7%)", amount: commission },
        { label: "Logistics Fee", amount: LOGISTICS_FEE }
      ];
      const pay = await Payment.findOne({ lotId: lot._id });
      const advance = Number(pay?.advanceAmount || 0);
      const finalAmount = Math.max(0, grossSale - deductions.reduce((s, d) => s + d.amount, 0) - advance);

      await Payment.updateOne(
        { lotId: lot._id },
        { $set: { deductions, finalAmount, settledAt: new Date() } },
        { upsert: true }
      );
    }

    await lot.save();

    await Notification.create({
      userId: lot.farmerId,
      type: "LOT_UPDATED",
      title: "Produce status updated",
      message: `Your booking ${lot.lotId} is now ${lot.status}.`,
      relatedId: lot._id.toString()
    });

    return res.json({ success: true, data: lot });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getLotById = async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await Lot.findById(id).populate("hubId", "name location capacityKg reservedKg storedKg");

    if (!lot) {
      return res.status(404).json({ success: false, message: "Lot not found" });
    }

    return res.json({ success: true, data: lot });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch lot" });
  }
};

const getFarmerLots = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { q } = req.query;

    const filter = { farmerId: req.user._id };
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
    return res.status(500).json({ success: false, message: "Failed to fetch farmer lots" });
  }
};

const getLotsByPhone = async (_req, res) => {
  return res.status(410).json({
    success: false,
    message: "Phone-based lot lookup is deprecated. Use authenticated /api/lots/my."
  });
};

module.exports = {
  createLot,
  getLots,
  updateLot,
  getFarmerLots,
  getLotsByPhone,
  getLotById,
  LOT_STATUS_FLOW,
  canTransition
};
