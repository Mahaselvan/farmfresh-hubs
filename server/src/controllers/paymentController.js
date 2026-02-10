const Payment = require("../models/Payment");
const Lot = require("../models/Lot");

exports.getLotLedger = async (req, res) => {
  const { lotId } = req.params;

  const lot = await Lot.findById(lotId).populate("hubId");
  if (!lot) {
    return res.status(404).json({ success: false, message: "Lot not found" });
  }

  const payment = await Payment.findOne({ lotId: lot._id });

  const estimatedValue = Number(lot.qtyKg) * Number(lot.expectedPrice);

  return res.json({
    success: true,
    data: {
      lot: {
        _id: lot._id,
        lotId: lot.lotId,
        crop: lot.crop,
        farmerName: lot.farmerName,
        qtyKg: lot.qtyKg,
        expectedPrice: lot.expectedPrice,
        status: lot.status,
        hub: lot.hubId
      },
      estimatedValue,
      payment: payment || {
        lotId: lot._id,
        advanceAmount: 0,
        deductions: [],
        finalAmount: 0,
        settledAt: null
      }
    }
  });
};
