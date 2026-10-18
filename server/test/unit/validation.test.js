const test = require("node:test");
const assert = require("node:assert");
require("../testHelper");

const validation = require("../../src/utils/validation");

test("Validation Utilities — escapeRegex", async (t) => {
  await t.test("escapes all regex metacharacters properly", () => {
    const input = "apple.*+?^${}()|[]\\banana";
    const expected = "apple\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\banana";
    assert.strictEqual(validation.escapeRegex(input), expected);
  });

  await t.test("returns empty string for non-string types", () => {
    assert.strictEqual(validation.escapeRegex(null), "");
    assert.strictEqual(validation.escapeRegex(undefined), "");
    assert.strictEqual(validation.escapeRegex(123), "");
    assert.strictEqual(validation.escapeRegex({ $regex: ".*" }), "");
    assert.strictEqual(validation.escapeRegex(["a", "b"]), "");
  });
});

test("Validation Utilities — parseSafeString", async (t) => {
  await t.test("trims whitespace from valid string", () => {
    assert.strictEqual(validation.parseSafeString("  tomato  "), "tomato");
  });

  await t.test("rejects strings exceeding maxLength", () => {
    assert.strictEqual(validation.parseSafeString("a".repeat(101), 100), null);
    assert.strictEqual(validation.parseSafeString("hello", 4), null);
    assert.strictEqual(validation.parseSafeString("hello", 5), "hello");
  });

  await t.test("rejects empty or whitespace-only strings", () => {
    assert.strictEqual(validation.parseSafeString(""), null);
    assert.strictEqual(validation.parseSafeString("   "), null);
  });

  await t.test("rejects non-string types and injection objects", () => {
    assert.strictEqual(validation.parseSafeString(null), null);
    assert.strictEqual(validation.parseSafeString(undefined), null);
    assert.strictEqual(validation.parseSafeString(42), null);
    assert.strictEqual(validation.parseSafeString({ $ne: null }), null);
    assert.strictEqual(validation.parseSafeString(["admin"]), null);
  });
});

test("Validation Utilities — parseSearchQuery", async (t) => {
  await t.test("trims, bounds length, and escapes metacharacters", () => {
    const query = "  crop.*name  ";
    assert.strictEqual(validation.parseSearchQuery(query, 64), "crop\\.\\*name");
  });

  await t.test("bounds string length before regex escaping", () => {
    const longString = "A".repeat(200);
    const result = validation.parseSearchQuery(longString, 20);
    assert.strictEqual(result.length, 20);
    assert.strictEqual(result, "A".repeat(20));
  });

  await t.test("defangs ReDoS catastrophic backtracking patterns", () => {
    const maliciousReDoS = "a".repeat(40) + "((((a+)+)+)+)+";
    const result = validation.parseSearchQuery(maliciousReDoS, 64);
    assert.strictEqual(result.includes("((("), false);
    assert(result.includes("\\("));
  });

  await t.test("returns empty string for empty, whitespace, or object inputs", () => {
    assert.strictEqual(validation.parseSearchQuery(""), "");
    assert.strictEqual(validation.parseSearchQuery("    "), "");
    assert.strictEqual(validation.parseSearchQuery(null), "");
    assert.strictEqual(validation.parseSearchQuery({ $gt: "" }), "");
  });
});

test("Validation Utilities — parseSafeNumber", async (t) => {
  await t.test("parses valid numeric strings and numbers", () => {
    assert.strictEqual(validation.parseSafeNumber("25.5"), 25.5);
    assert.strictEqual(validation.parseSafeNumber(100), 100);
    assert.strictEqual(validation.parseSafeNumber("0"), 0);
  });

  await t.test("enforces minimum and maximum bounds", () => {
    assert.strictEqual(validation.parseSafeNumber("-5", { min: 0 }), null);
    assert.strictEqual(validation.parseSafeNumber("5", { min: 0, max: 10 }), 5);
    assert.strictEqual(validation.parseSafeNumber("15", { min: 0, max: 10 }), null);
  });

  await t.test("returns undefined for absent inputs (optional parameters)", () => {
    assert.strictEqual(validation.parseSafeNumber(undefined), undefined);
    assert.strictEqual(validation.parseSafeNumber(null), undefined);
    assert.strictEqual(validation.parseSafeNumber(""), undefined);
  });

  await t.test("rejects non-numeric strings, NaN, infinity, and operator objects", () => {
    assert.strictEqual(validation.parseSafeNumber("abc"), null);
    assert.strictEqual(validation.parseSafeNumber(NaN), null);
    assert.strictEqual(validation.parseSafeNumber(Infinity), null);
    assert.strictEqual(validation.parseSafeNumber({ $gte: 0 }), null);
    assert.strictEqual(validation.parseSafeNumber([10]), null);
  });
});

test("Validation Utilities — parseSafeBoolean", async (t) => {
  await t.test("parses boolean primitives and literal strings", () => {
    assert.strictEqual(validation.parseSafeBoolean(true), true);
    assert.strictEqual(validation.parseSafeBoolean("true"), true);
    assert.strictEqual(validation.parseSafeBoolean(false), false);
    assert.strictEqual(validation.parseSafeBoolean("false"), false);
  });

  await t.test("returns undefined for absent or invalid boolean inputs", () => {
    assert.strictEqual(validation.parseSafeBoolean(undefined), undefined);
    assert.strictEqual(validation.parseSafeBoolean(""), undefined);
    assert.strictEqual(validation.parseSafeBoolean("yes"), undefined);
    assert.strictEqual(validation.parseSafeBoolean("0"), undefined);
    assert.strictEqual(validation.parseSafeBoolean({ $ne: false }), undefined);
  });
});

test("Validation Utilities — parseSafeLimit", async (t) => {
  await t.test("parses valid integers within bounds", () => {
    assert.strictEqual(validation.parseSafeLimit("10", 50, 200), 10);
    assert.strictEqual(validation.parseSafeLimit(100, 50, 200), 100);
  });

  await t.test("caps limit at maxLimit", () => {
    assert.strictEqual(validation.parseSafeLimit("500", 50, 200), 200);
  });

  await t.test("falls back to defaultLimit for negative, zero, non-finite, or absent values", () => {
    assert.strictEqual(validation.parseSafeLimit(undefined, 50, 200), 50);
    assert.strictEqual(validation.parseSafeLimit("", 50, 200), 50);
    assert.strictEqual(validation.parseSafeLimit("0", 50, 200), 50);
    assert.strictEqual(validation.parseSafeLimit("-10", 50, 200), 50);
    assert.strictEqual(validation.parseSafeLimit("invalid", 50, 200), 50);
    assert.strictEqual(validation.parseSafeLimit({ $ne: null }, 50, 200), 50);
  });
});

test("Validation Utilities — isValidObjectId", async (t) => {
  await t.test("accepts valid 24-character hex ObjectId strings", () => {
    assert.strictEqual(validation.isValidObjectId("507f1f77bcf86cd799439011"), true);
    assert.strictEqual(validation.isValidObjectId("65b1c9a123456789abcdef01"), true);
  });

  await t.test("rejects non-hex, malformed, or non-string inputs", () => {
    assert.strictEqual(validation.isValidObjectId("not-an-id"), false);
    assert.strictEqual(validation.isValidObjectId("507f1f77bcf86cd79943901z"), false);
    assert.strictEqual(validation.isValidObjectId(123456789012), false);
    assert.strictEqual(validation.isValidObjectId(null), false);
    assert.strictEqual(validation.isValidObjectId(undefined), false);
    assert.strictEqual(validation.isValidObjectId({ $ne: null }), false);
  });
});
