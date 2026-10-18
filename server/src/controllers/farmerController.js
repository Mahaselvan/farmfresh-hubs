const Lot = require("../models/Lot");

exports.getFarmerLotsByPhone = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const lots = await Lot.find({ farmerId: req.user._id })
    .populate("hubId", "name location")
    .sort({ createdAt: -1 });

  return res.json({ success: true, data: lots });
};
