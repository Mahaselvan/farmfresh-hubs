const Lot = require("../models/Lot");
const { SAFE_RANGES } = require("../constants/config");

const getAlerts = async (req, res) => {
  // Read all lots that are in storage pipeline (received/stored/listed)
  const lots = await Lot.find({ status: { $in: ["RECEIVED", "STORED", "LISTED"] } })
    .populate("hubId", "name location")
    .sort({ updatedAt: -1 });

  const alerts = [];

  for (const lot of lots) {
    const tempBad = lot.temp < SAFE_RANGES.temp.min || lot.temp > SAFE_RANGES.temp.max;
    const humBad = lot.humidity < SAFE_RANGES.humidity.min || lot.humidity > SAFE_RANGES.humidity.max;

    if (tempBad || humBad) {
      alerts.push({
        lotObjectId: lot._id,
        lotId: lot.lotId,
        crop: lot.crop,
        status: lot.status,
        hub: lot.hubId,
        temp: lot.temp,
        humidity: lot.humidity,
        issues: [
          ...(tempBad ? [`Temp out of range (${SAFE_RANGES.temp.min}-${SAFE_RANGES.temp.max}°C)`] : []),
          ...(humBad ? [`Humidity out of range (${SAFE_RANGES.humidity.min}-${SAFE_RANGES.humidity.max}%)`] : [])
        ],
        updatedAt: lot.updatedAt
      });
    }
  }

  res.json({
    success: true,
    data: {
      safeRanges: SAFE_RANGES,
      count: alerts.length,
      alerts
    }
  });
};

module.exports = { getAlerts };
