const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
require("../testHelper");

// Import the real application exported from server.js
const { app } = require("../../src/server");

test("Express HTTP Integration Tests (Mounted Application)", async (t) => {
  let server;
  let baseUrl;

  t.before(async () => {
    // Bind the real app instance to an ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  t.after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test("GET /api/health responds with 200 OK and expected JSON body", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, "FarmFresh Hubs API running ✅");
    assert(typeof body.time === "string");
  });

  await t.test("GET /api/health is accessible across concurrent requests", async () => {
    const requests = Array.from({ length: 20 }).map(() => fetch(`${baseUrl}/api/health`));
    const responses = await Promise.all(requests);
    for (const r of responses) {
      assert.strictEqual(r.status, 200);
    }
  });

  await t.test("Protected route GET /api/lots rejects unauthenticated request with 401", async () => {
    const res = await fetch(`${baseUrl}/api/lots`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert(body.message.toLowerCase().includes("token") || body.message.toLowerCase().includes("unauthorized"));
  });

  await t.test("Protected route GET /api/lots rejects invalid token with 401", async () => {
    const res = await fetch(`${baseUrl}/api/lots`, {
      headers: { Authorization: "Bearer invalid.fake.token" }
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test("Protected route GET /api/notifications rejects unauthenticated request with 401", async () => {
    const res = await fetch(`${baseUrl}/api/notifications`);
    assert.strictEqual(res.status, 401);
  });

  await t.test("404 handler returns for non-existent routes", async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-route`);
    assert.strictEqual(res.status, 404);
  });
});

test("Live HTTP Rate Limiting Verification (Real express-rate-limit)", async (t) => {
  const express = require("express");
  const rateLimit = require("express-rate-limit");
  const { RATE_LIMIT_MESSAGE } = require("../../src/middleware/rateLimit");
  const { configureTrustProxy } = require("../../src/server");

  let rateLimitServer;
  let testBaseUrl;

  t.before(async () => {
    const testApp = express();
    configureTrustProxy(testApp);

    // Exempt health check route mounted before rate limiting
    testApp.get("/api/health", (req, res) => {
      res.json({ success: true, message: "FarmFresh Hubs API running ✅" });
    });

    // Test-only limiter with low threshold: 2 requests per window
    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.ip,
      handler: (req, res) => {
        return res.status(429).json({
          success: false,
          message: RATE_LIMIT_MESSAGE
        });
      }
    });

    testApp.get("/api/test-limit", testLimiter, (req, res) => {
      res.json({ success: true, count: req.query.c || 1 });
    });

    rateLimitServer = http.createServer(testApp);
    await new Promise((resolve) => rateLimitServer.listen(0, "127.0.0.1", resolve));
    testBaseUrl = `http://127.0.0.1:${rateLimitServer.address().port}`;
  });

  t.after(async () => {
    if (rateLimitServer) {
      await new Promise((resolve) => rateLimitServer.close(resolve));
    }
  });

  await t.test("requests within limit return HTTP 200 OK", async () => {
    const res1 = await fetch(`${testBaseUrl}/api/test-limit?c=1`);
    assert.strictEqual(res1.status, 200);
    const body1 = await res1.json();
    assert.strictEqual(body1.success, true);

    const res2 = await fetch(`${testBaseUrl}/api/test-limit?c=2`);
    assert.strictEqual(res2.status, 200);
    const body2 = await res2.json();
    assert.strictEqual(body2.success, true);
  });

  await t.test("excess requests beyond limit return HTTP 429 with expected JSON body", async () => {
    const res3 = await fetch(`${testBaseUrl}/api/test-limit?c=3`);
    assert.strictEqual(res3.status, 429);
    assert.strictEqual(res3.headers.get("content-type")?.includes("application/json"), true);

    const body3 = await res3.json();
    assert.strictEqual(body3.success, false);
    assert.strictEqual(body3.message, "Too many requests. Please try again later.");
  });

  await t.test("GET /api/health bypasses rate limiting even when limit is exceeded", async () => {
    const healthRes = await fetch(`${testBaseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthBody = await healthRes.json();
    assert.strictEqual(healthBody.success, true);
  });

  await t.test("spoofed X-Forwarded-For header is ignored when proxy is untrusted", async () => {
    // In development mode (default), trust proxy is false, so spoofed header does not bypass limiter
    const spoofedRes = await fetch(`${testBaseUrl}/api/test-limit?c=spoof`, {
      headers: { "X-Forwarded-For": "203.0.113.195" }
    });
    // Since socket IP 127.0.0.1 already consumed the quota, spoofed IP is ignored and still returns 429
    assert.strictEqual(spoofedRes.status, 429);
  });
});

