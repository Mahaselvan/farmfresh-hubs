const crypto = require("crypto");

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALPHABET_LEN = ALPHABET.length; // 36

/**
 * Generate a cryptographically secure random alphanumeric string
 * using Node.js crypto.randomInt (unbiased uniform distribution).
 * @param {number} length - Desired string length (defaults to 8).
 * @returns {string} - Uppercase alphanumeric string.
 */
const generateId = (length = 8) => {
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHABET[crypto.randomInt(0, ALPHABET_LEN)];
  }
  return id;
};

const makeLotId = () => `LOT-${generateId(8)}`;
const makeOrderId = () => `ORD-${generateId(8)}`;

const makeLotQrString = (lotId) => `farmfresh://trace/${lotId}`;

/**
 * Executes a creation callback with bounded retries on MongoDB E11000 duplicate key errors.
 * Re-throws immediately on validation errors or non-duplicate errors.
 * @param {Function} fn - Asynchronous function to execute.
 * @param {number} maxRetries - Maximum retry attempts (defaults to 3).
 * @returns {Promise<any>}
 */
const withDuplicateKeyRetry = async (fn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      const isDuplicate = err && (
        err.code === 11000 ||
        err.code === 11001 ||
        (err.name === "MongoServerError" && err.code === 11000) ||
        (typeof err.message === "string" && err.message.includes("E11000"))
      );
      if (isDuplicate && attempt < maxRetries) {
        continue;
      }
      throw err;
    }
  }
};

module.exports = {
  makeLotId,
  makeOrderId,
  makeLotQrString,
  generateId,
  withDuplicateKeyRetry,
  ALPHABET
};
