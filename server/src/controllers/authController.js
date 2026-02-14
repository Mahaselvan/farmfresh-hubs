const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const signToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { _id, name, email, phone, role, createdAt, updatedAt } = user;
  return { _id, name, email, phone, role, createdAt, updatedAt };
};

const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body || {};

    if (!password || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        message: "Email or phone and password are required"
      });
    }
    if (role && !["farmer", "consumer", "operator", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const existing = await User.findOne({
      $or: [
        email ? { email: email.toLowerCase() } : null,
        phone ? { phone } : null
      ].filter(Boolean)
    });

    if (existing) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      phone,
      passwordHash,
      role: role || "consumer"
    });

    const token = signToken(user);
    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body || {};

    if (!password || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        message: "Email or phone and password are required"
      });
    }

    const user = await User.findOne(
      email ? { email: email.toLowerCase() } : { phone }
    );

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

const me = async (req, res) => {
  return res.json({ success: true, user: req.user });
};

module.exports = { register, login, me };
