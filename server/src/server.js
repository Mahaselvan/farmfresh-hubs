require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const { readLimiter } = require("./middleware/rateLimit");

const hubRoutes = require("./routes/hubRoutes");
const lotRoutes = require("./routes/lotRoutes");
const marketRoutes = require("./routes/marketRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const alertRoutes = require("./routes/alertRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
const authRoutes = require("./routes/authRoutes");

// ✅ CREATE APP FIRST
const app = express();

// ---------------- MIDDLEWARE ----------------
// ---------------- PROXY / CLIENT IP ----------------
const configureTrustProxy = (appInstance) => {
  const trustProxyEnv = process.env.TRUST_PROXY ? process.env.TRUST_PROXY.trim() : "";
  const isProduction = process.env.NODE_ENV === "production";

  if (!trustProxyEnv) {
    // Default: in production behind a single reverse proxy (e.g. Render), trust 1 hop.
    // In development, do not trust proxies (direct connection).
    appInstance.set("trust proxy", isProduction ? 1 : false);
    return;
  }

  if (trustProxyEnv.toLowerCase() === "false") {
    appInstance.set("trust proxy", false);
    return;
  }

  if (trustProxyEnv.toLowerCase() === "true") {
    if (isProduction) {
      throw new Error(
        "TRUST_PROXY='true' is insecure in production because it permits arbitrary X-Forwarded-For spoofing. " +
        "Specify the exact proxy hop count (e.g., TRUST_PROXY=1) or trusted subnet/CIDR (e.g., 'loopback')."
      );
    }
    appInstance.set("trust proxy", true);
    return;
  }

  const numericHops = Number(trustProxyEnv);
  if (Number.isInteger(numericHops) && numericHops >= 0) {
    appInstance.set("trust proxy", numericHops);
    return;
  }

  // Comma-separated IP addresses, CIDR, or predefined Express keywords like "loopback", "linklocal", "uniquelocal"
  if (trustProxyEnv.length > 0) {
    appInstance.set("trust proxy", trustProxyEnv);
    return;
  }

  throw new Error(`Invalid TRUST_PROXY configuration: '${trustProxyEnv}'`);
};

configureTrustProxy(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
    process.env.CLIENT_ORIGIN || "http://localhost:5173",
    "https://farmfresh-hubs.onrender.com",
  ],
  methods: ["GET","POST","PATCH","DELETE"],
}));

app.use(morgan("dev"));

// ---------------- HEALTH CHECK (EXEMPT FROM RATE LIMITING) ----------------
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FarmFresh Hubs API running ✅",
    time: new Date().toISOString()
  });
});

app.use("/api", (req, res, next) => {
  if (req.method === "GET") {
    return readLimiter(req, res, next);
  }
  return next();
});

// ---------------- ROUTES ----------------
app.use("/api/farmer", farmerRoutes);
app.use("/api/auth", authRoutes);

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

if (require.main === module) {
  (async () => {
    await connectDB(process.env.MONGO_URI);

    try {
      const { reconcilePendingRefunds } = require("./controllers/paymentController");
      const rec = await reconcilePendingRefunds();
      if (rec && rec.reconciledCount > 0) {
        console.log(`[Payment] Startup recovery: reconciled ${rec.reconciledCount} pending refund(s)`);
      }
    } catch (e) {
      console.warn("[Payment] Startup refund recovery check skipped:", e.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })();
}

module.exports = { app, configureTrustProxy };
