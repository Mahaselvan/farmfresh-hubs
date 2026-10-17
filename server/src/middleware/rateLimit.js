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
    validate: { ip: false, xForwardedForHeader: false, default: false },
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

const sanitizeOrderId = (rawOrderId) => {
  if (typeof rawOrderId !== "string") return "no-order";
  const trimmed = rawOrderId.trim();
  if (!trimmed) return "no-order";
  return trimmed.slice(0, 64);
};

const paymentVerifyLimiter = createApiLimiter({
  windowMinutes: 10,
  max: 40,
  keyGenerator: (req) => {
    const userId = req.user?._id ? String(req.user._id) : "anon";
    const safeOrderId = sanitizeOrderId(req.body?.orderId);
    return `${req.ip}:${userId}:${safeOrderId}`;
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
  RATE_LIMIT_MESSAGE,
  sanitizeOrderId
};
