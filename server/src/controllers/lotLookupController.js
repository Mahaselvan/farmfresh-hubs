const Lot = require("../models/Lot");

const getLotByLotId = async (req, res) => {
  const { lotId } = req.params;

  const lot = await Lot.findOne({ lotId }).populate("hubId", "name location");
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
