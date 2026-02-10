const Lot = require("../models/Lot");

exports.getFarmerLotsByPhone = async (req, res) => {
  const { phone } = req.query;

  if (!phone || String(phone).trim().length < 8) {
    return res.status(400).json({ success: false, message: "Phone is required" });
  }

  const lots = await Lot.find({ phone: String(phone).trim() })
    .populate("hubId", "name location")
    .sort({ createdAt: -1 });

  return res.json({ success: true, data: lots });
};
