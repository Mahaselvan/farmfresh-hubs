const mongoose = require("mongoose");

/**
 * Escapes special regex characters in a user-provided string to prevent ReDoS
 * and unwanted regex pattern injection.
 */
const escapeRegex = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Validates whether a value is a non-empty scalar string within maxLength.
 */
const parseSafeString = (val, maxLength = 100) => {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
};

/**
 * Validates a scalar search query string, escapes regex characters, and caps length.
 */
const parseSearchQuery = (val, maxLength = 64) => {
  if (typeof val !== "string") return "";
  const trimmed = val.trim();
  if (!trimmed) return "";
  const bounded = trimmed.slice(0, maxLength);
  return escapeRegex(bounded);
};

/**
 * Validates a finite number within optional [min, max] range.
 */
const parseSafeNumber = (val, { min = -Infinity, max = Infinity } = {}) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "object") return null; // Reject objects/arrays
  const num = Number(val);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return num;
};

/**
 * Explicitly parses boolean values from query strings or direct booleans.
 */
const parseSafeBoolean = (val) => {
  if (val === true || val === "true") return true;
  if (val === false || val === "false") return false;
  return undefined;
};

/**
 * Safely parses pagination limit within [1, maxLimit].
 */
const parseSafeLimit = (val, defaultLimit = 50, maxLimit = 200) => {
  if (val === undefined || val === null || val === "") return defaultLimit;
  if (typeof val === "object") return defaultLimit;
  const parsed = parseInt(val, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultLimit;
  return Math.min(parsed, maxLimit);
};

/**
 * Validates a MongoDB ObjectId string.
 */
const isValidObjectId = (id) => {
  if (typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
  escapeRegex,
  parseSafeString,
  parseSearchQuery,
  parseSafeNumber,
  parseSafeBoolean,
  parseSafeLimit,
  isValidObjectId
};
