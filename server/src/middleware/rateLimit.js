const rateLimit = require("express-rate-limit");

const RATE_LIMIT_MESSAGE = "Too many requests. Please try again later.";

const parseWindowMs = (minutes) => minutes * 60 * 1000;

const buildKey = (req) => {
  const userId = req.user?._id ? String(req.user._id) : "anon";
  return `${req.ip}:${userId}`;
};

const createApiLimiter = ({ windowMinutes, max, keyGenerator }) => {
  return rateLimit({
    windowMs: parseWindowMs(windowMinutes),
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || buildKey,
    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        message: RATE_LIMIT_MESSAGE
      });
    }
  });
};

const readLimiter = createApiLimiter({
  windowMinutes: 1,
  max: 300,
  keyGenerator: (req) => req.ip
});

const authLimiter = createApiLimiter({
  windowMinutes: 15,
  max: 20,
  keyGenerator: (req) => req.ip
});

const paymentCreateLimiter = createApiLimiter({
  windowMinutes: 10,
  max: 25
});

const paymentVerifyLimiter = createApiLimiter({
  windowMinutes: 10,
  max: 40,
  keyGenerator: (req) => {
    const userId = req.user?._id ? String(req.user._id) : "anon";
    const orderId = typeof req.body?.orderId === "string" ? req.body.orderId.trim() : "";
    return `${req.ip}:${userId}:${orderId || "no-order"}`;
  }
});

const lotMutationLimiter = createApiLimiter({
  windowMinutes: 10,
  max: 30
});

const orderMutationLimiter = createApiLimiter({
  windowMinutes: 10,
  max: 30
});

module.exports = {
  readLimiter,
  authLimiter,
  paymentCreateLimiter,
  paymentVerifyLimiter,
  lotMutationLimiter,
  orderMutationLimiter,
  RATE_LIMIT_MESSAGE
};
