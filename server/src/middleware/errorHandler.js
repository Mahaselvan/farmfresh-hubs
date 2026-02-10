const errorHandler = (err, req, res, next) => {
  // Log server-side
  console.error("🔥 Error:", err);

  // Handle Mongoose invalid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`
    });
  }

  // Handle Mongoose duplicate key
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    return res.status(400).json({
      success: false,
      message: `Duplicate value for: ${fields.join(", ")}`
    });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};

module.exports = errorHandler;
