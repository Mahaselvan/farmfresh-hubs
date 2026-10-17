const test = require("node:test");
const assert = require("node:assert");
require("../testHelper");

test("Razorpay API Live Sandbox Integration Tests", async (t) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  const isConfigured = keyId && keySecret && !keyId.includes("YOUR_KEY") && !keySecret.includes("YOUR_SECRET");

  if (!isConfigured) {
    t.skip("BLOCKED / SKIPPED: Razorpay live sandbox test skipped because active RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured in the environment.");
    return;
  }

  const Razorpay = require("razorpay");
  const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });

  await t.test("Can create order on Razorpay API sandbox", async () => {
    const order = await instance.orders.create({
      amount: 50000, // ₹500 in paise
      currency: "INR",
      receipt: `test_receipt_${Date.now()}`
    });
    assert(order && order.id, "Razorpay should return an order with an ID");
    assert.strictEqual(order.amount, 50000);
    assert.strictEqual(order.currency, "INR");
  });
});
