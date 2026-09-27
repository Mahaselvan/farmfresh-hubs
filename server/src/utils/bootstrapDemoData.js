const Hub = require("../models/Hub");

const DEFAULT_HUBS = [
  { name: "FarmFresh Hub - OMR", location: "Chennai OMR", capacityKg: 20000, reservedKg: 0, storedKg: 0 },
  { name: "FarmFresh Hub - Kanchipuram", location: "Kanchipuram", capacityKg: 15000, reservedKg: 0, storedKg: 0 },
  { name: "FarmFresh Hub - Tiruvallur", location: "Tiruvallur", capacityKg: 12000, reservedKg: 0, storedKg: 0 }
];

let bootstrapPromise = null;

async function ensureDemoData() {
  if (bootstrapPromise) {
    await bootstrapPromise;
    return;
  }

  bootstrapPromise = (async () => {
    const hubs = await Hub.find({}).limit(1);
    if (hubs.length === 0) {
      await Hub.insertMany(DEFAULT_HUBS);
    }
  })();

  try {
    await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}

module.exports = { ensureDemoData };
