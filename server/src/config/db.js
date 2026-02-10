const mongoose = require("mongoose");

const connectDB = async (mongoUri) => {
  try {
    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(mongoUri);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
