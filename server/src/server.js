require("dotenv").config();
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

const app = express();

// Middleware
app.use("/api/farmer", farmerRoutes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, cb) => {
      // allow Thunder Client / Postman (no origin) + Vite dev servers
      if (!origin) return cb(null, true);

      // allow http://localhost:5173, 5174, 5175... (any Vite port)
      if (origin.startsWith("http://localhost:517")) return cb(null, true);

      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: false
  })
);


app.use(morgan("dev"));

// Health check
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

// Error handler (keep last)
app.use(errorHandler);

// Start server only after DB connects
const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB(process.env.MONGO_URI);

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();
