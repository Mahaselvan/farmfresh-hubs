const test = require("node:test");
const assert = require("node:assert");
require("../testHelper");

const {
  makeLotId,
  makeOrderId,
  makeLotQrString,
  generateId,
  withDuplicateKeyRetry,
  ALPHABET
} = require("../../src/utils/id");

test("ID Generator — Suffix and Alphabet Specifications", async (t) => {
  await t.test("ALPHABET contains exactly 36 uppercase alphanumeric characters", () => {
    assert.strictEqual(ALPHABET.length, 36);
    assert.strictEqual(ALPHABET, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    // Ensure no duplicate characters
    const uniqueChars = new Set(ALPHABET);
    assert.strictEqual(uniqueChars.size, 36);
  });

  await t.test("generateId produces exact requested lengths", () => {
    assert.strictEqual(generateId(8).length, 8);
    assert.strictEqual(generateId(4).length, 4);
    assert.strictEqual(generateId(16).length, 16);
    assert.strictEqual(generateId().length, 8); // default length
  });

  await t.test("generateId produces only characters from ALPHABET", () => {
    const id = generateId(64);
    for (const char of id) {
      assert(ALPHABET.includes(char), `Character '${char}' must be in ALPHABET`);
    }
  });
});

test("Lot ID Generator — makeLotId", async (t) => {
  await t.test("generates ID with 'LOT-' prefix and 8-character suffix (total 12 characters)", () => {
    const lotId = makeLotId();
    assert(lotId.startsWith("LOT-"), "Must start with 'LOT-'");
    assert.strictEqual(lotId.length, 12, "Total length must be 12 (4 prefix + 8 suffix)");
  });

  await t.test("suffix matches uppercase alphanumeric regex ^[0-9A-Z]{8}$", () => {
    const lotId = makeLotId();
    const suffix = lotId.slice(4);
    assert.strictEqual(suffix.length, 8);
    assert(/^[0-9A-Z]{8}$/.test(suffix), `Suffix '${suffix}' must be 8 uppercase alphanumeric chars`);
  });
});

test("Order ID Generator — makeOrderId", async (t) => {
  await t.test("generates ID with 'ORD-' prefix and 8-character suffix (total 12 characters)", () => {
    const orderId = makeOrderId();
    assert(orderId.startsWith("ORD-"), "Must start with 'ORD-'");
    assert.strictEqual(orderId.length, 12, "Total length must be 12 (4 prefix + 8 suffix)");
  });

  await t.test("suffix matches uppercase alphanumeric regex ^[0-9A-Z]{8}$", () => {
    const orderId = makeOrderId();
    const suffix = orderId.slice(4);
    assert.strictEqual(suffix.length, 8);
    assert(/^[0-9A-Z]{8}$/.test(suffix), `Suffix '${suffix}' must be 8 uppercase alphanumeric chars`);
  });
});

test("QR Code URI Generator — makeLotQrString", async (t) => {
  await t.test("generates exact farmfresh://trace/ URI format", () => {
    const lotId = makeLotId();
    const qrString = makeLotQrString(lotId);
    assert.strictEqual(qrString, `farmfresh://trace/${lotId}`);
  });

  await t.test("preserves custom and legacy lot identifiers without modification", () => {
    assert.strictEqual(makeLotQrString("LOT-FARMER-A"), "farmfresh://trace/LOT-FARMER-A");
    assert.strictEqual(makeLotQrString("LOT-12345678"), "farmfresh://trace/LOT-12345678");
  });
});

test("Collision Resistance & Statistical Uniformity", async (t) => {
  await t.test("generates 10,000 consecutive lot IDs without collisions", () => {
    const iterations = 10000;
    const seen = new Set();
    const charCounts = {};
    for (const c of ALPHABET) charCounts[c] = 0;

    for (let i = 0; i < iterations; i++) {
      const lotId = makeLotId();
      assert(!seen.has(lotId), `Collision detected on iteration ${i}: ${lotId}`);
      seen.add(lotId);
      assert(/^LOT-[0-9A-Z]{8}$/.test(lotId), `Invalid format: ${lotId}`);

      const suffix = lotId.slice(4);
      for (const char of suffix) {
        charCounts[char] = (charCounts[char] || 0) + 1;
      }
    }

    assert.strictEqual(seen.size, iterations);

    // Verify all 36 characters were generated at least once across 80,000 characters
    for (const c of ALPHABET) {
      assert(charCounts[c] > 0, `Character '${c}' was never generated in 10,000 IDs`);
    }
  });

  await t.test("generates 10,000 consecutive order IDs without collisions", () => {
    const iterations = 10000;
    const seen = new Set();

    for (let i = 0; i < iterations; i++) {
      const orderId = makeOrderId();
      assert(!seen.has(orderId), `Collision detected on iteration ${i}: ${orderId}`);
      seen.add(orderId);
      assert(/^ORD-[0-9A-Z]{8}$/.test(orderId), `Invalid format: ${orderId}`);
    }

    assert.strictEqual(seen.size, iterations);
  });
});

test("Duplicate Key Collision Retry Handler — withDuplicateKeyRetry", async (t) => {
  await t.test("executes successfully on first attempt when no error occurs", async () => {
    let callCount = 0;
    const result = await withDuplicateKeyRetry(async (attempt) => {
      callCount++;
      assert.strictEqual(attempt, 1);
      return "success_1";
    });
    assert.strictEqual(callCount, 1);
    assert.strictEqual(result, "success_1");
  });

  await t.test("retries on MongoDB duplicate key error (code 11000) and succeeds on subsequent attempt", async () => {
    let callCount = 0;
    const result = await withDuplicateKeyRetry(async (attempt) => {
      callCount++;
      if (attempt === 1) {
        const dupErr = new Error("E11000 duplicate key error collection: farmfresh.lots index: lotId_1 dup key");
        dupErr.code = 11000;
        throw dupErr;
      }
      return `recovered_on_attempt_${attempt}`;
    });
    assert.strictEqual(callCount, 2);
    assert.strictEqual(result, "recovered_on_attempt_2");
  });

  await t.test("retries on MongoServerError with code 11000", async () => {
    let callCount = 0;
    const result = await withDuplicateKeyRetry(async (attempt) => {
      callCount++;
      if (attempt < 3) {
        const mongoErr = new Error("duplicate key");
        mongoErr.name = "MongoServerError";
        mongoErr.code = 11000;
        throw mongoErr;
      }
      return "recovered_attempt_3";
    });
    assert.strictEqual(callCount, 3);
    assert.strictEqual(result, "recovered_attempt_3");
  });

  await t.test("re-throws non-duplicate error immediately without retrying", async () => {
    let callCount = 0;
    await assert.rejects(
      async () => {
        await withDuplicateKeyRetry(async (attempt) => {
          callCount++;
          const valErr = new Error("ValidationError: crop is required");
          valErr.name = "ValidationError";
          throw valErr;
        });
      },
      (err) => {
        assert.strictEqual(err.name, "ValidationError");
        return true;
      }
    );
    assert.strictEqual(callCount, 1, "Must not retry validation errors");
  });

  await t.test("re-throws duplicate error after exceeding maxRetries", async () => {
    let callCount = 0;
    await assert.rejects(
      async () => {
        await withDuplicateKeyRetry(async (attempt) => {
          callCount++;
          const dupErr = new Error("E11000 persistent duplicate");
          dupErr.code = 11000;
          throw dupErr;
        }, 3);
      },
      (err) => {
        assert.strictEqual(err.code, 11000);
        return true;
      }
    );
    assert.strictEqual(callCount, 3, "Must stop after maxRetries attempts");
  });

  await t.test("generates unique fresh IDs across retry attempts", async () => {
    const generatedIds = [];
    await withDuplicateKeyRetry(async (attempt) => {
      const newId = makeLotId();
      generatedIds.push(newId);
      if (attempt === 1) {
        const dupErr = new Error("E11000 duplicate key");
        dupErr.code = 11000;
        throw dupErr;
      }
      return newId;
    });
    assert.strictEqual(generatedIds.length, 2);
    assert.notStrictEqual(generatedIds[0], generatedIds[1], "Retried ID must be freshly generated");
  });
});
