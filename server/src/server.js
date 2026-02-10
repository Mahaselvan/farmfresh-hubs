require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const hubRoutes = require("./routes/hubRoutes");
const lotRoutes = require("./routes/lotRoutes");
const marketRoutes = require("./routes/marketRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const alertRoutes = require("./routes/alertRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const farmerRoutes = require("./routes/farmerRoutes");

// ✅ CREATE APP FIRST
const app = express();

// ---------------- MIDDLEWARE ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman, server-to-server

      // Allow local dev
      if (origin.startsWith("http://localhost:517")) {
        return cb(null, true);
      }

      // Allow production frontend
      if (origin === "https://farmfresh-hubs.onrender.com") {
        return cb(null, true);
      }

      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: false
  })
);

app.use(morgan("dev"));

// ---------------- ROUTES ----------------
app.use("/api/farmer", farmerRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FarmFresh Hubs API running ✅",
    time: new Date().toISOString()
  });
});

app.use("/api/hubs", hubRoutes);
app.use("/api/lots", lotRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/notifications", notificationRoutes);

// ---------------- FRONTEND (PRODUCTION) ----------------
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../client/dist")));

  app.get("*", (req, res) => {
    res.sendFile(
      path.join(__dirname, "../../client/dist/index.html")
    );
  });
}

// ---------------- ERROR HANDLER ----------------
app.use(errorHandler);

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB(process.env.MONGO_URI);

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();
