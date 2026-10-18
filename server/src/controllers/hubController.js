const Hub = require("../models/Hub");

const DEFAULT_HUBS = [
  { name: "FarmFresh Hub - OMR", location: "Chennai OMR", capacityKg: 20000, reservedKg: 0, storedKg: 0 },
  { name: "FarmFresh Hub - Kanchipuram", location: "Kanchipuram", capacityKg: 15000, reservedKg: 0, storedKg: 0 },
  { name: "FarmFresh Hub - Tiruvallur", location: "Tiruvallur", capacityKg: 12000, reservedKg: 0, storedKg: 0 }
];

const getHubs = async (req, res) => {
  let hubs = await Hub.find({}).sort({ createdAt: -1 });

  if (hubs.length === 0) {
    await Hub.insertMany(DEFAULT_HUBS);
    hubs = await Hub.find({}).sort({ createdAt: -1 });
  }

  res.json({ success: true, data: hubs });
};

module.exports = { getHubs };
