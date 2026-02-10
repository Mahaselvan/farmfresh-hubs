const Hub = require("../models/Hub");

const getHubs = async (req, res) => {
  const hubs = await Hub.find({}).sort({ createdAt: -1 });
  res.json({ success: true, data: hubs });
};

module.exports = { getHubs };
