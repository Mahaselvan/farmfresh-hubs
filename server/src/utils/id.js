const { nanoid } = require("nanoid");

const makeLotId = () => `LOT-${nanoid(8).toUpperCase()}`;
const makeOrderId = () => `ORD-${nanoid(8).toUpperCase()}`;

const makeLotQrString = (lotId) => `farmfresh://trace/${lotId}`;

module.exports = { makeLotId, makeOrderId, makeLotQrString };
