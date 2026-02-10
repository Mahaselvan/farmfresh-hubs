const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { getHubs } = require("../controllers/hubController");

const router = express.Router();

router.get("/", asyncHandler(getHubs));

module.exports = router;
