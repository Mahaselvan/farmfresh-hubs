const SAFE_RANGES = {
  temp: { min: 2, max: 8 },       // °C (demo range)
  humidity: { min: 60, max: 85 }  // %  (demo range)
};

const FEES = {
  commissionRate: 0.07, // 7%
  logisticsFlat: 50     // ₹ flat fee (demo)
};

module.exports = { SAFE_RANGES, FEES };
