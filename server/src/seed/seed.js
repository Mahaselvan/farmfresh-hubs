require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Hub = require("../models/Hub");
const Lot = require("../models/Lot");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");

const { makeLotId, makeLotQrString } = require("../utils/id");

const run = async () => {
  await connectDB(process.env.MONGO_URI);

  console.log("🧹 Clearing existing data...");
  await Promise.all([
    Notification.deleteMany({}),
    Payment.deleteMany({}),
    Lot.deleteMany({}),
    Hub.deleteMany({})
  ]);

  console.log("🏗️ Seeding hubs...");
  const hubs = await Hub.insertMany([
    { name: "FarmFresh Hub - OMR", location: "Chennai OMR", capacityKg: 20000, currentUsedKg: 0 },
    { name: "FarmFresh Hub - Kanchipuram", location: "Kanchipuram", capacityKg: 15000, currentUsedKg: 0 },
    { name: "FarmFresh Hub - Tiruvallur", location: "Tiruvallur", capacityKg: 12000, currentUsedKg: 0 }
  ]);

  const [hub1, hub2, hub3] = hubs;

  console.log("🌾 Seeding 5 lots...");
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
      status: "STORED",
      hubId: hub2._id,
      temp: 5,
      humidity: 68
    },
    {
      farmerName: "Suresh",
      phone: "9000011111",
      village: "Poonamallee",
      crop: "Potato",
      qtyKg: 300,
      expectedPrice: 26,
      storageDays: 7,
      grade: "B",
      status: "LISTED",
      hubId: hub3._id,
      temp: 4,
      humidity: 72
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
      hubId: hub1._id,
      temp: 3,
      humidity: 75
    },
    {
      farmerName: "Arun",
      phone: "9555554444",
      village: "Tambaram",
      crop: "Beans",
      qtyKg: 120,
      expectedPrice: 55,
      storageDays: 2,
      grade: "C",
      status: "SOLD",
      hubId: hub2._id,
      temp: 7,
      humidity: 80
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

  const lots = await Lot.insertMany(lotsToInsert);

  console.log("💰 Creating advance payments (50% of estimated value) + notifications...");
  for (const lot of lots) {
    const estimatedValue = lot.qtyKg * lot.expectedPrice;
    const advanceAmount = Math.round(estimatedValue * 0.5);

    await Payment.create({
      lotId: lot._id,
      advanceAmount,
      deductions: { commission: 0, logisticsFee: 0 },
      finalAmount: 0,
      settledAt: null
    });

    await Notification.create({
      type: "BOOKING_CREATED",
      message: `Booking created for ${lot.crop} (${lot.qtyKg}kg) - ${lot.lotId}`,
      relatedId: lot.lotId
    });

    // Update hub usage
    await Hub.updateOne(
      { _id: lot.hubId },
      { $inc: { currentUsedKg: lot.qtyKg } }
    );
  }

  console.log("✅ Seeding complete!");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
