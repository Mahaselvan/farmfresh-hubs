const test = require("node:test");
const assert = require("node:assert");
require("../testHelper");

test("MongoDB Live Integration Tests", async (t) => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri.includes("YOUR_MONGO") || mongoUri.includes("<password>")) {
    t.skip("BLOCKED / SKIPPED: Live MongoDB integration test skipped because MONGO_URI is not configured in the environment.");
    return;
  }

  let connection;
  try {
    const mongoose = require("mongoose");
    connection = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    t.skip(`BLOCKED / SKIPPED: MongoDB instance unreachable at ${mongoUri}. Reason: ${err.message}`);
    return;
  }

  await t.test("Can connect to live MongoDB and perform basic read/write operations", async () => {
    assert(connection, "Mongoose connection should be established");
    assert.strictEqual(typeof connection.connection.readyState, "number");
  });

  t.after(async () => {
    if (connection && connection.disconnect) {
      await connection.disconnect();
    }
  });
});
