const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["farmer", "consumer", "operator", "admin"],
      default: "consumer"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
