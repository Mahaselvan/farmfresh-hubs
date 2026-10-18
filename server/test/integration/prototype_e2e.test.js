const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const path = require("node:path");

// Set NODE_ENV to production to enable client static serving
process.env.NODE_ENV = "production";

require("../testHelper");
const { app } = require("../../src/server");

test("Prototype End-to-End Runtime Verification", async (t) => {
  let server;
  let baseUrl;

  t.before(async () => {
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

  await t.test("1. Backend API Health Check responds on /api/health", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, "FarmFresh Hubs API running ✅");
    assert(typeof body.time === "string");
  });

  await t.test("2. Frontend Single-Page App HTML is served at root /", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert(text.includes("<div id=\"root\"></div>"), "Root div must be present in HTML");
    assert(text.includes("<title>FarmFresh</title>"), "FarmFresh title must be present");
  });

  await t.test("3. Frontend compiled JavaScript bundle is served via /assets/", async () => {
    const res = await fetch(`${baseUrl}/assets/index-DA7otLA0.js`);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get("content-type");
    assert(contentType && (contentType.includes("javascript") || contentType.includes("application/")), "Must be JS content-type");
    const text = await res.text();
    assert(text.length > 100000, "Vite bundle must be served in full");
  });

  await t.test("4. Public marketplace endpoint /api/market/lots enforces sanitization", async () => {
    const res = await fetch(`${baseUrl}/api/market/lots`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert(Array.isArray(body.data));
  });

  await t.test("5. Traceability endpoint /api/market/trace/:lotId validates format", async () => {
    const res = await fetch(`${baseUrl}/api/market/trace/INVALID-HEX-ID`);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Invalid lot id");
  });

  await t.test("6. Protected order route /api/orders requires authentication", async () => {
    const res = await fetch(`${baseUrl}/api/orders`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test("7. Administrative refund recovery /api/payments/reconcile-refunds rejects unauthenticated access", async () => {
    const res = await fetch(`${baseUrl}/api/payments/reconcile-refunds`, {
      method: "POST"
    });
    assert.strictEqual(res.status, 401);
  });
});
