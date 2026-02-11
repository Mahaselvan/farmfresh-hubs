const Hub = require("../models/Hub");
const Lot = require("../models/Lot");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const { makeLotId, makeLotQrString } = require("./id");

const DEFAULT_HUBS = [
  { name: "FarmFresh Hub - OMR", location: "Chennai OMR", capacityKg: 20000, currentUsedKg: 0 },
  { name: "FarmFresh Hub - Kanchipuram", location: "Kanchipuram", capacityKg: 15000, currentUsedKg: 0 },
  { name: "FarmFresh Hub - Tiruvallur", location: "Tiruvallur", capacityKg: 12000, currentUsedKg: 0 }
];

let bootstrapPromise = null;

async function ensureDemoData() {
  if (bootstrapPromise) {
    await bootstrapPromise;
    return;
  }

  bootstrapPromise = (async () => {
  const lotCount = await Lot.estimatedDocumentCount();
  if (lotCount > 0) return;

  let hubs = await Hub.find({}).sort({ createdAt: 1 });
  if (hubs.length === 0) {
    await Hub.insertMany(DEFAULT_HUBS);
    hubs = await Hub.find({}).sort({ createdAt: 1 });
  }

  if (hubs.length === 0) return;

  const hub1 = hubs[0];
  const hub2 = hubs[1] || hubs[0];
  const hub3 = hubs[2] || hubs[0];
  const lotsRaw = [
    {
      farmerName: "Ravi Kumar",
      phone: "9876543210",
      village: "Thoraipakkam",
      crop: "Tomato",
      qtyKg: 180,
      expectedPrice: 28,
      storageDays: 4,
      grade: "B",
      status: "RECEIVED",
      hubId: hub1._id,
      temp: 6,
      humidity: 70
    },
    {
      farmerName: "Meena Devi",
      phone: "9123456780",
      village: "Sriperumbudur",
      crop: "Onion",
      qtyKg: 250,
      expectedPrice: 22,
      storageDays: 6,
      grade: "A",
      status: "LISTED",
      hubId: hub2._id,
      temp: 5,
      humidity: 68
    },
    {
      farmerName: "Lakshmi",
      phone: "9888887777",
      village: "Kelambakkam",
      crop: "Carrot",
      qtyKg: 140,
      expectedPrice: 40,
      storageDays: 3,
      grade: "A",
      status: "LISTED",
      hubId: hub3._id,
      temp: 3,
      humidity: 75
    }
  ];

  const lotsToInsert = lotsRaw.map((l) => {
    const lotId = makeLotId();
    return {
      ...l,
      lotId,
      qrString: makeLotQrString(lotId)
    };
  });

  const createdLots = await Lot.insertMany(lotsToInsert);

  await Promise.all(
    createdLots.map(async (lot) => {
      const estimatedValue = Number(lot.qtyKg) * Number(lot.expectedPrice);
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
        type: "BOOKING_CREATED",
        message: `Booking created for ${lot.crop} (${lot.qtyKg}kg) - ${lot.lotId}`,
        relatedId: lot.lotId
      });

      await Hub.updateOne({ _id: lot.hubId }, { $inc: { currentUsedKg: Number(lot.qtyKg) } });
    })
  );
  })();

  try {
    await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}

module.exports = { ensureDemoData };
