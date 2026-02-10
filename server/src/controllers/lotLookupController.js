const Lot = require("../models/Lot");

const getLotByLotId = async (req, res) => {
  const { lotId } = req.params;

  const lot = await Lot.findOne({ lotId }).populate("hubId", "name location");
  if (!lot) return res.status(404).json({ success: false, message: "Lot not found" });

  res.json({ success: true, data: lot });
};

module.exports = { getLotByLotId };
