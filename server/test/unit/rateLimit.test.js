const test = require("node:test");
const assert = require("node:assert");
require("../testHelper");

const { sanitizeOrderId } = require("../../src/middleware/rateLimit");
const { configureTrustProxy } = require("../../src/server");

test("Rate Limiting — sanitizeOrderId", async (t) => {
  await t.test("bounds key length to 64 characters", () => {
    const longOrderId = "ORD-" + "x".repeat(200);
    const sanitized = sanitizeOrderId(longOrderId);
    assert.strictEqual(sanitized.length, 64);
    assert(sanitized.startsWith("ORD-"));
  });

  await t.test("trims valid order IDs", () => {
    const orderId = "  ORD-1234  ";
    const sanitized = sanitizeOrderId(orderId);
    assert.strictEqual(sanitized, "ORD-1234");
  });

  await t.test("falls back to 'no-order' for empty, whitespace, or non-string inputs", () => {
    assert.strictEqual(sanitizeOrderId(""), "no-order");
    assert.strictEqual(sanitizeOrderId("   "), "no-order");
    assert.strictEqual(sanitizeOrderId(null), "no-order");
    assert.strictEqual(sanitizeOrderId(undefined), "no-order");
    assert.strictEqual(sanitizeOrderId({ id: "123" }), "no-order");
    assert.strictEqual(sanitizeOrderId(12345), "no-order");
  });
});

test("Server Proxy Trust Configuration — configureTrustProxy", async (t) => {
  function createMockApp() {
    const settings = {};
    return {
      set: (k, v) => { settings[k] = v; },
      get: (k) => settings[k]
    };
  }

  const originalEnv = { ...process.env };

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  await t.test("defaults to false in development when TRUST_PROXY is not set", () => {
    delete process.env.TRUST_PROXY;
    process.env.NODE_ENV = "development";
    const app = createMockApp();
    configureTrustProxy(app);
    assert.strictEqual(app.get("trust proxy"), false);
  });

  await t.test("defaults to 1 hop in production when TRUST_PROXY is not set", () => {
    delete process.env.TRUST_PROXY;
    process.env.NODE_ENV = "production";
    const app = createMockApp();
    configureTrustProxy(app);
    assert.strictEqual(app.get("trust proxy"), 1);
  });

  await t.test("throws an error in production when TRUST_PROXY='true' (spoofing prevention)", () => {
    process.env.TRUST_PROXY = "true";
    process.env.NODE_ENV = "production";
    const app = createMockApp();
    assert.throws(
      () => configureTrustProxy(app),
      /TRUST_PROXY='true' is insecure in production/
    );
  });

  await t.test("permits TRUST_PROXY='true' in development", () => {
    process.env.TRUST_PROXY = "true";
    process.env.NODE_ENV = "development";
    const app = createMockApp();
    configureTrustProxy(app);
    assert.strictEqual(app.get("trust proxy"), true);
  });

  await t.test("configures numeric hops correctly", () => {
    process.env.TRUST_PROXY = "2";
    const app = createMockApp();
    configureTrustProxy(app);
    assert.strictEqual(app.get("trust proxy"), 2);
  });

  await t.test("configures trusted subnet / keyword strings correctly", () => {
    process.env.TRUST_PROXY = "loopback";
    const app = createMockApp();
    configureTrustProxy(app);
    assert.strictEqual(app.get("trust proxy"), "loopback");

    process.env.TRUST_PROXY = "10.0.0.0/8";
    const app2 = createMockApp();
    configureTrustProxy(app2);
    assert.strictEqual(app2.get("trust proxy"), "10.0.0.0/8");
  });
});
