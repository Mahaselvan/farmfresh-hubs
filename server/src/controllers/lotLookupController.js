const Lot = require("../models/Lot");
const { parseSafeString } = require("../utils/validation");

const getLotByLotId = async (req, res) => {
  const { lotId } = req.params;
  const cleanLotId = parseSafeString(lotId, 64);
  if (!cleanLotId) return res.status(400).json({ success: false, message: "Invalid lotId" });

  const lot = await Lot.findOne({ lotId: cleanLotId }).populate("hubId", "name location");
  if (!lot) return res.status(404).json({ success: false, message: "Lot not found" });

  res.json({
    success: true,
    data: {
      lotId: lot.lotId,
      crop: lot.crop,
      village: lot.village,
      qtyKg: lot.qtyKg,
      grade: lot.grade,
      status: lot.status,
      temp: lot.temp,
      humidity: lot.humidity,
      hub: lot.hubId,
      events: lot.events || []
    }
  });
};

module.exports = { getLotByLotId };
