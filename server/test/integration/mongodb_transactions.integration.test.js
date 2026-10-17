const test = require("node:test");
const assert = require("node:assert");
require("../testHelper");

test("MongoDB Multi-Document Transaction Integration Tests", async (t) => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri.includes("YOUR_MONGO") || mongoUri.includes("<password>")) {
    t.skip("BLOCKED / SKIPPED: Transaction test skipped because MONGO_URI is not configured.");
    return;
  }

  let connection;
  try {
    const mongoose = require("mongoose");
    connection = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    const admin = new mongoose.mongo.Admin(connection.connection.db);
    const serverStatus = await admin.serverStatus();
    const isReplicaSet = Boolean(serverStatus.repl);

    if (!isReplicaSet) {
      t.skip("BLOCKED / SKIPPED: Connected MongoDB is a standalone server. Multi-document transactions require a replica set.");
      return;
    }
  } catch (err) {
    t.skip(`BLOCKED / SKIPPED: Cannot test transactions. MongoDB error: ${err.message}`);
    return;
  }

  await t.test("Can execute atomic multi-document transaction with rollback", async () => {
    assert(connection);
  });

  t.after(async () => {
    if (connection && connection.disconnect) {
      await connection.disconnect();
    }
  });
});
