const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("../testHelper");

const { mockRes, MockRazorpay } = require("../testHelper");
const razorpayConfig = require("../../src/config/razorpay");

// Isolate Razorpay client with MockRazorpay for unit tests
process.env.RAZORPAY_KEY_ID = "rzp_mock_key_id";
process.env.RAZORPAY_KEY_SECRET = "test_razorpay_secret_key_12345";
razorpayConfig.hasCredentials = true;
razorpayConfig.razorpay = new MockRazorpay();

// Isolate Mongoose session and transaction methods for unit tests
mongoose.startSession = async () => ({
  withTransaction: async (cb) => cb(),
  endSession: async () => {},
  abortTransaction: async () => {},
  commitTransaction: async () => {}
});

// Regression guard: Unit tests must never attempt a real network connection to MongoDB
mongoose.connect = async () => {
  throw new Error("REGRESSION ERROR: controllers.test.js must never call mongoose.connect()");
};
if (mongoose.connection) {
  mongoose.connection.openUri = async () => {
    throw new Error("REGRESSION ERROR: controllers.test.js must never open a Mongoose connection URI");
  };
}

const validHexId1 = "507f1f77bcf86cd799439011";
const validHexId2 = "507f1f77bcf86cd799439022";
const validHexId3 = "507f1f77bcf86cd799439033";
const validHexHub = "507f1f77bcf86cd799439044";

// Shared mock database state for controller tests
const db = {
  lots: new Map(),
  hubs: new Map(),
  orders: new Map(),
  payments: new Map(),
  notifications: []
};

razorpayConfig.razorpay._resolvePayment = (paymentId) => {
  const orders = Array.from(db.orders.values()).reverse();
  // 1. Exact paymentId match
  for (const ord of orders) {
    if (ord.razorpay?.paymentId === paymentId) {
      return {
        id: paymentId,
        order_id: ord.razorpay.orderId,
        amount: Math.round(Number(ord.totalAmount) * 100),
        currency: "INR",
        status: "captured"
      };
    }
  }
  // 2. Matching payment suffix to razorpay orderId suffix
  for (const ord of orders) {
    if (ord.razorpay?.orderId) {
      const cleanPay = paymentId.replace(/^(pay_|pay_test_)/, "");
      const cleanOrd = ord.razorpay.orderId.replace(/^(order_rp_|order_rp_sec_|order_sec_rp_|order_)/, "");
      if (cleanPay === cleanOrd || paymentId.includes(cleanOrd) || ord.razorpay.orderId.includes(cleanPay)) {
        return {
          id: paymentId,
          order_id: ord.razorpay.orderId,
          amount: Math.round(Number(ord.totalAmount) * 100),
          currency: "INR",
          status: "captured"
        };
      }
    }
  }
  // 3. Fallback to latest order with razorpay.orderId
  for (const ord of orders) {
    if (ord.razorpay?.orderId) {
      return {
        id: paymentId,
        order_id: ord.razorpay.orderId,
        amount: Math.round(Number(ord.totalAmount) * 100),
        currency: "INR",
        status: "captured"
      };
    }
  }
  return {
    id: paymentId,
    order_id: "order_rp_valid",
    amount: 40000,
    currency: "INR",
    status: "captured"
  };
};

// Wire models to the db state
const Lot = require("../../src/models/Lot");
const Hub = require("../../src/models/Hub");
const Order = require("../../src/models/Order");
const Payment = require("../../src/models/Payment");
const Notification = require("../../src/models/Notification");

// Setup model stubs that interact with `db`
Lot.find = (filter = {}) => {
  let list = Array.from(db.lots.values());
  if (filter.status && filter.status.$in) {
    list = list.filter(l => filter.status.$in.includes(l.status));
  }
  if (filter.crop) {
    list = list.filter(l => l.crop === filter.crop);
  }
  if (filter.farmerId) {
    list = list.filter(l => String(l.farmerId) === String(filter.farmerId));
  }
  if (filter._id && filter._id.$in) {
    const idStrings = filter._id.$in.map(String);
    list = list.filter(l => idStrings.includes(String(l._id)));
  }
  const queryObj = {
    populate: () => queryObj,
    sort: () => queryObj,
    session: () => queryObj,
    limit: (lim) => Promise.resolve(lim ? list.slice(0, lim) : list),
    then: (resolve) => resolve(list)
  };
  return queryObj;
};

Lot.findById = (id) => {
  const item = db.lots.get(String(id)) || null;
  return {
    populate: () => Promise.resolve(item),
    session: () => Promise.resolve(item),
    then: (resolve) => resolve(item)
  };
};

Lot.findOne = (query) => {
  let item = null;
  if (query.lotId) {
    item = Array.from(db.lots.values()).find(l => l.lotId === query.lotId) || null;
  }
  return {
    populate: () => Promise.resolve(item),
    then: (resolve) => resolve(item)
  };
};

Lot.create = async (data) => {
  const record = {
    _id: data._id || validHexId1,
    sales: [],
    events: [],
    ...data,
    save: async function() { db.lots.set(String(this._id), this); return this; }
  };
  db.lots.set(String(record._id), record);
  return record;
};

Lot.findOneAndUpdate = async (filter, update, options) => {
  const lot = db.lots.get(String(filter._id));
  if (!lot) return null;

  if (filter.remainingQtyKg && filter.remainingQtyKg.$gte !== undefined) {
    if (Number(lot.remainingQtyKg ?? 0) < Number(filter.remainingQtyKg.$gte)) {
      return null;
    }
  }

  if (update.$inc) {
    if (update.$inc.remainingQtyKg !== undefined) {
      lot.remainingQtyKg = Number(lot.remainingQtyKg ?? 0) + Number(update.$inc.remainingQtyKg);
    }
    if (update.$inc.qtyKg !== undefined) {
      lot.qtyKg = Number(lot.qtyKg ?? 0) + Number(update.$inc.qtyKg);
    }
  }

  if (update.$push && update.$push.sales) {
    if (!lot.sales) lot.sales = [];
    lot.sales.push(update.$push.sales);
  }

  if (update.$push && update.$push.events) {
    if (!lot.events) lot.events = [];
    lot.events.push(update.$push.events);
  }

  if (update.$pull && update.$pull.sales) {
    if (lot.sales) {
      lot.sales = lot.sales.filter(s => s.orderId !== update.$pull.sales.orderId);
    }
  }

  if (update.$set) {
    Object.assign(lot, update.$set);
  }

  db.lots.set(String(lot._id), lot);
  return lot;
};

Lot.updateOne = async (filter, update) => {
  const lot = db.lots.get(String(filter._id));
  if (!lot) return { modifiedCount: 0 };

  if (update.$inc) {
    if (update.$inc.remainingQtyKg !== undefined) {
      lot.remainingQtyKg = Number(lot.remainingQtyKg ?? 0) + Number(update.$inc.remainingQtyKg);
    }
    if (update.$inc.qtyKg !== undefined) {
      lot.qtyKg = Number(lot.qtyKg ?? 0) + Number(update.$inc.qtyKg);
    }
  }
  if (update.$pull && update.$pull.sales) {
    if (lot.sales) {
      lot.sales = lot.sales.filter(s => s.orderId !== update.$pull.sales.orderId);
    }
  }
  if (update.$set) {
    Object.assign(lot, update.$set);
  }
  if (update.$push && update.$push.events) {
    if (!lot.events) lot.events = [];
    lot.events.push(update.$push.events);
  }
  db.lots.set(String(lot._id), lot);
  return { modifiedCount: 1 };
};

Hub.find = (filter = {}) => {
  let list = Array.from(db.hubs.values());
  const queryObj = {
    populate: () => queryObj,
    sort: () => queryObj,
    session: () => queryObj,
    limit: (lim) => Promise.resolve(lim ? list.slice(0, lim) : list),
    then: (resolve) => resolve(list)
  };
  return queryObj;
};

Hub.insertMany = async (arr) => {
  arr.forEach(h => {
    const id = h._id || validHexHub;
    db.hubs.set(String(id), { _id: id, ...h });
  });
  return arr;
};

Hub.findById = async (id) => {
  return db.hubs.get(String(id)) || null;
};

Hub.updateOne = async (filter, update) => {
  const hub = db.hubs.get(String(filter._id));
  if (hub && update.$inc && update.$inc.storedKg) {
    hub.storedKg = (hub.storedKg || 0) + update.$inc.storedKg;
  }
  return { modifiedCount: 1 };
};

Order.find = (filter = {}) => {
  let list = Array.from(db.orders.values());
  if (filter.customerId) {
    list = list.filter(o => String(o.customerId) === String(filter.customerId));
  }
  if (filter.paymentStatus && filter.paymentStatus.$in) {
    list = list.filter(o => filter.paymentStatus.$in.includes(o.paymentStatus));
  }
  return {
    limit: (n) => Promise.resolve(list.slice(0, n || list.length)),
    sort: () => ({
      limit: (n) => Promise.resolve(list.slice(0, n || list.length))
    }),
    then: (resolve) => resolve(list)
  };
};

Order.findById = (id) => {
  const item = db.orders.get(String(id)) || null;
  return {
    populate: () => Promise.resolve(item),
    session: () => Promise.resolve(item),
    then: (resolve) => resolve(item)
  };
};

Order.findOne = (query) => {
  let item = null;
  if (query.orderId) {
    item = Array.from(db.orders.values()).find(o => o.orderId === query.orderId) || null;
  }
  return {
    populate: () => Promise.resolve(item),
    session: () => Promise.resolve(item),
    then: (resolve) => resolve(item)
  };
};

Order.create = async (data) => {
  const record = {
    _id: data._id || validHexId1,
    ...data,
    save: async function() { db.orders.set(String(this._id), this); return this; }
  };
  db.orders.set(String(record._id), record);
  return record;
};

Order.findOneAndUpdate = async (filter, update, options) => {
  let match = null;
  for (const o of db.orders.values()) {
    if (filter._id && String(o._id) !== String(filter._id)) continue;
    if (filter["refund.status"] && filter["refund.status"].$nin) {
      if (filter["refund.status"].$nin.includes(o.refund?.status)) continue;
    }
    match = o;
    break;
  }
  if (!match) return null;
  if (update.$set) {
    if (!match.refund) match.refund = {};
    if (update.$set["refund.status"]) match.refund.status = update.$set["refund.status"];
    if (update.$set["refund.leaseExpiresAt"]) match.refund.leaseExpiresAt = update.$set["refund.leaseExpiresAt"];
  }
  db.orders.set(String(match._id), match);
  return match;
};

Payment.findOne = async (query) => {
  return db.payments.get(String(query.lotId)) || null;
};

Payment.updateOne = async (filter, update) => {
  const existing = db.payments.get(String(filter.lotId)) || {};
  const updated = { ...existing, ...update.$set, ...update.$setOnInsert };
  db.payments.set(String(filter.lotId), updated);
  return { modifiedCount: 1 };
};

Notification.create = async (data) => {
  const records = Array.isArray(data) ? data : [data];
  records.forEach(r => db.notifications.push(r));
  return records;
};

Notification.find = (filter = {}) => {
  let list = [...db.notifications];
  if (filter.$or) {
    list = list.filter(n => {
      return filter.$or.some(cond => {
        if (cond.userId === null) return n.userId === null;
        return String(n.userId) === String(cond.userId);
      });
    });
  }
  const queryObj = {
    sort: () => queryObj,
    limit: (lim) => Promise.resolve(lim ? list.slice(0, lim) : list),
    then: (resolve) => resolve(list)
  };
  return queryObj;
};

Notification.findById = async (id) => {
  return db.notifications.find(n => String(n._id) === String(id)) || null;
};

Notification.countDocuments = async (filter = {}) => {
  return db.notifications.filter(n => !n.read).length;
};

Notification.updateMany = async (filter, update) => {
  let count = 0;
  db.notifications.forEach(n => {
    if (!filter.userId || String(n.userId) === String(filter.userId)) {
      if (update.$set && update.$set.read !== undefined) {
        n.read = update.$set.read;
        count++;
      }
    }
  });
  return { modifiedCount: count };
};

// Razorpay mock credentials for payment controller unit tests
process.env.RAZORPAY_KEY_ID = "rzp_mock_key_id";
process.env.RAZORPAY_KEY_SECRET = "test_razorpay_secret_key_12345";

// Controllers
const marketController = require("../../src/controllers/marketController");
const notificationController = require("../../src/controllers/notificationController");
const lotController = require("../../src/controllers/lotController");
const lotLookupController = require("../../src/controllers/lotLookupController");
const orderController = require("../../src/controllers/orderController");
const paymentController = require("../../src/controllers/paymentController");

// Helper to reset db state before each test
function resetDb() {
  db.lots.clear();
  db.hubs.clear();
  db.orders.clear();
  db.payments.clear();
  db.notifications.length = 0;

  // Default hub
  db.hubs.set(validHexHub, {
    _id: validHexHub,
    name: "Tiruvallur Hub",
    location: "Tiruvallur",
    capacityKg: 10000,
    reservedKg: 0,
    storedKg: 100,
    save: async function() { return this; }
  });

  // Seed Farmer A lot
  const lotA = {
    _id: validHexId1,
    lotId: "LOT-FARMER-A",
    farmerId: validHexId1,
    farmerName: "Alice Farmer",
    phone: "9876543210",
    village: "Tiruvallur",
    crop: "Organic Tomato",
    qtyKg: 100,
    originalQtyKg: 100,
    remainingQtyKg: 100,
    expectedPrice: 40,
    storageDays: 3,
    status: "LISTED",
    grade: "A",
    temp: 5,
    humidity: 70,
    hubId: { _id: validHexHub, name: "Tiruvallur Hub", location: "Tiruvallur" },
    sales: [],
    events: [{ type: "BOOKED", timestamp: new Date(), note: "Booking confirmed" }],
    save: async function() { db.lots.set(String(this._id), this); return this; }
  };
  db.lots.set(validHexId1, lotA);

  // Seed Farmer B lot
  const lotB = {
    _id: validHexId2,
    lotId: "LOT-FARMER-B",
    farmerId: validHexId2,
    farmerName: "Bob Farmer",
    phone: "9123456789",
    village: "Kanchipuram",
    crop: "Fresh Onion",
    qtyKg: 200,
    originalQtyKg: 200,
    remainingQtyKg: 200,
    expectedPrice: 25,
    storageDays: 5,
    status: "STORED",
    grade: "B",
    temp: 6,
    humidity: 68,
    hubId: { _id: validHexHub, name: "Tiruvallur Hub", location: "Tiruvallur" },
    sales: [],
    events: [],
    save: async function() { db.lots.set(String(this._id), this); return this; }
  };
  db.lots.set(validHexId2, lotB);
}

// ---------------------------------------------------------------------------
// 1. MARKETPLACE CONTROLLER TESTS
// ---------------------------------------------------------------------------
test("Marketplace Controller", async (t) => {
  t.beforeEach(resetDb);

  await t.test("getMarketLots returns listed lots without private farmer data", async () => {
    const res = mockRes();
    await marketController.getMarketLots({ query: {} }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert.strictEqual(res.body.data.length, 1); // Only LOT-FARMER-A is LISTED

    const item = res.body.data[0];
    assert.strictEqual(item.lotId, "LOT-FARMER-A");
    assert.strictEqual(item.crop, "Organic Tomato");
    assert.strictEqual(item.farmerId, undefined, "Must NOT expose farmerId");
    assert.strictEqual(item.farmerName, undefined, "Must NOT expose farmerName");
    assert.strictEqual(item.phone, undefined, "Must NOT expose farmer phone");
  });

  await t.test("getMarketLots handles valid optional filters correctly", async () => {
    const res = mockRes();
    await marketController.getMarketLots({
      query: { crop: "Organic Tomato", grade: "A", minPrice: "10", maxPrice: "50", limit: "10" }
    }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.length, 1);
  });

  await t.test("getMarketLots rejects inverted price range (minPrice > maxPrice)", async () => {
    const res = mockRes();
    await marketController.getMarketLots({ query: { minPrice: "50", maxPrice: "20" } }, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.message, "minPrice cannot be greater than maxPrice");
  });

  await t.test("getMarketLots rejects operator injection objects in filters", async () => {
    const resCrop = mockRes();
    await marketController.getMarketLots({ query: { crop: { $ne: null } } }, resCrop);
    assert.strictEqual(resCrop.statusCode, 400);
    assert.strictEqual(resCrop.body.message, "Invalid crop filter");

    const resGrade = mockRes();
    await marketController.getMarketLots({ query: { grade: { $gt: "" } } }, resGrade);
    assert.strictEqual(resGrade.statusCode, 400);
    assert.strictEqual(resGrade.body.message, "Invalid grade");
  });

  await t.test("getMarketLotById returns single listed lot with timeline", async () => {
    const res = mockRes();
    await marketController.getMarketLotById({ params: { lotId: validHexId1 } }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.lot.lotId, "LOT-FARMER-A");
    assert(Array.isArray(res.body.data.timeline));
  });

  await t.test("getMarketLotById returns 404 for unlisted lots (e.g. STORED)", async () => {
    const res = mockRes();
    await marketController.getMarketLotById({ params: { lotId: validHexId2 } }, res);
    assert.strictEqual(res.statusCode, 404);
    assert(res.body.message.includes("is not available in marketplace"));
  });

  await t.test("getTrace returns public traceability data without leaking farmer identity", async () => {
    const res = mockRes();
    await marketController.getTrace({ params: { lotId: validHexId1 } }, res);
    assert.strictEqual(res.statusCode, 200);
    const traceLot = res.body.data.lot;
    assert.strictEqual(traceLot.lotId, "LOT-FARMER-A");
    assert.strictEqual(traceLot.crop, "Organic Tomato");
    assert.strictEqual(traceLot.farmerId, undefined);
    assert.strictEqual(traceLot.farmerName, undefined);
    assert.strictEqual(traceLot.phone, undefined);
    assert.strictEqual(traceLot.sales, undefined);
  });
});

// ---------------------------------------------------------------------------
// 2. NOTIFICATIONS CONTROLLER TESTS
// ---------------------------------------------------------------------------
test("Notifications Controller", async (t) => {
  t.beforeEach(() => {
    resetDb();
    db.notifications.push(
      { _id: validHexId1, userId: validHexId1, type: "BOOKING_CREATED", title: "Note 1", message: "Msg 1", read: false, save: async function() { this.read = true; return this; } },
      { _id: validHexId2, userId: validHexId2, type: "ORDER_CREATED", title: "Note 2", message: "Msg 2", read: false, save: async function() { this.read = true; return this; } },
      { _id: validHexId3, userId: null, type: "ALERT", title: "Broadcast", message: "System alert", read: false, save: async function() { this.read = true; return this; } }
    );
  });

  await t.test("getNotifications isolates user notifications and returns unread count", async () => {
    const res = mockRes();
    await notificationController.getNotifications({
      query: {},
      user: { _id: validHexId1, role: "consumer" }
    }, res);
    assert.strictEqual(res.statusCode, 200);
    // Consumer 1 sees Note 1 and Broadcast Note 3, but NOT Consumer 2's Note 2
    assert.strictEqual(res.body.data.length, 2);
    assert.strictEqual(typeof res.body.meta.unreadCount, "number");
  });

  await t.test("getNotifications supports Navbar polling parameters (limit=1, unreadOnly=true)", async () => {
    const res = mockRes();
    await notificationController.getNotifications({
      query: { limit: "1", unreadOnly: "true" },
      user: { _id: validHexId1, role: "consumer" }
    }, res);
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.data.length <= 1);
  });

  await t.test("getNotifications rejects unsupported notification types and operator injection", async () => {
    const resInvalid = mockRes();
    await notificationController.getNotifications({ query: { type: "HACK_TYPE" }, user: { _id: validHexId1 } }, resInvalid);
    assert.strictEqual(resInvalid.statusCode, 400);

    const resInj = mockRes();
    await notificationController.getNotifications({ query: { type: { $ne: null } }, user: { _id: validHexId1 } }, resInj);
    assert.strictEqual(resInj.statusCode, 400);
  });

  await t.test("markAsRead allows owner to mark read and forbids cross-user access", async () => {
    const resOwner = mockRes();
    await notificationController.markAsRead({
      params: { id: validHexId1 },
      user: { _id: validHexId1, role: "consumer" }
    }, resOwner);
    assert.strictEqual(resOwner.statusCode, 200);

    const resForbidden = mockRes();
    await notificationController.markAsRead({
      params: { id: validHexId2 }, // Belongs to User 2
      user: { _id: validHexId1, role: "consumer" }
    }, resForbidden);
    assert.strictEqual(resForbidden.statusCode, 403);
    assert.strictEqual(resForbidden.body.message, "Forbidden");
  });

  await t.test("markAsRead forbids regular users from marking broadcast (userId: null) read", async () => {
    const resBroadcast = mockRes();
    await notificationController.markAsRead({
      params: { id: validHexId3 }, // userId: null
      user: { _id: validHexId1, role: "consumer" }
    }, resBroadcast);
    assert.strictEqual(resBroadcast.statusCode, 403);
  });

  await t.test("markAllAsRead only marks caller's notifications as read for non-admins", async () => {
    const res = mockRes();
    await notificationController.markAllAsRead({ user: { _id: validHexId1, role: "consumer" } }, res);
    assert.strictEqual(res.statusCode, 200);
  });
});

// ---------------------------------------------------------------------------
// 3. LOT & LOT LOOKUP CONTROLLER TESTS
// ---------------------------------------------------------------------------
test("Lot & Lot Lookup Controllers", async (t) => {
  t.beforeEach(resetDb);

  await t.test("createLot creates a new lot with valid booking parameters", async () => {
    const req = {
      body: {
        village: "Tiruvallur",
        crop: "Potato",
        qtyKg: 50,
        expectedPrice: 30,
        hubId: validHexHub,
        storageDays: 3
      },
      user: { _id: validHexId1, role: "farmer", name: "Alice Farmer", phone: "9876543210" }
    };
    const res = mockRes();
    await lotController.createLot(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.crop, "Potato");
    assert.strictEqual(res.body.data.status, "RECEIVED");
  });

  await t.test("createLot rejects missing required fields and invalid quantities", async () => {
    const reqMissing = { body: { crop: "Potato" }, user: { _id: validHexId1, role: "farmer" } };
    const resMissing = mockRes();
    await lotController.createLot(reqMissing, resMissing);
    assert.strictEqual(resMissing.statusCode, 400);

    const reqNegative = {
      body: { village: "V", crop: "C", qtyKg: -5, expectedPrice: 30, hubId: validHexHub, storageDays: 3 },
      user: { _id: validHexId1, role: "farmer" }
    };
    const resNegative = mockRes();
    await lotController.createLot(reqNegative, resNegative);
    assert.strictEqual(resNegative.statusCode, 400);
  });

  await t.test("createLot retries on duplicate key collision and recovers with fresh lotId", async () => {
    const origCreate = Lot.create;
    let attempts = 0;
    const generatedIds = [];
    Lot.create = async (data) => {
      attempts++;
      generatedIds.push(data.lotId);
      if (attempts === 1) {
        const dupErr = new Error("E11000 duplicate key error on lotId");
        dupErr.code = 11000;
        throw dupErr;
      }
      return origCreate(data);
    };

    try {
      const req = {
        body: { village: "Kanchipuram", crop: "Tomato", qtyKg: 20, expectedPrice: 25, hubId: validHexHub, storageDays: 2 },
        user: { _id: validHexId1, role: "farmer", name: "Alice Farmer", phone: "9876543210" }
      };
      const res = mockRes();
      await lotController.createLot(req, res);
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(attempts, 2, "Should have retried once after E11000");
      assert.strictEqual(generatedIds.length, 2);
      assert.notStrictEqual(generatedIds[0], generatedIds[1], "Retried lotId must be fresh");
    } finally {
      Lot.create = origCreate;
    }
  });

  await t.test("updateLot validates state machine transitions", async () => {
    // Valid: STORED -> LISTED
    const resValid = mockRes();
    await lotController.updateLot({
      params: { id: validHexId2 }, // lotB is STORED
      body: { status: "LISTED" },
      user: { role: "operator" }
    }, resValid);
    assert.strictEqual(resValid.statusCode, 200);
    assert.strictEqual(resValid.body.data.status, "LISTED");

    // Invalid: LISTED -> SETTLED directly
    const resInvalid = mockRes();
    await lotController.updateLot({
      params: { id: validHexId2 },
      body: { status: "SETTLED" },
      user: { role: "operator" }
    }, resInvalid);
    assert.strictEqual(resInvalid.statusCode, 400);
    assert(resInvalid.body.message.includes("Invalid status transition"));
  });

  await t.test("getFarmerLots strictly isolates produce to calling farmer", async () => {
    const res = mockRes();
    await lotController.getFarmerLots({
      query: {},
      user: { _id: validHexId1, role: "farmer" }
    }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].lotId, "LOT-FARMER-A");
  });

  await t.test("getLotById enforces strict authorization boundaries", async () => {
    // 1. Owner farmer can access their own lot
    const resOwner = mockRes();
    await lotController.getLotById({
      params: { id: validHexId1 },
      user: { _id: validHexId1, role: "farmer" }
    }, resOwner);
    assert.strictEqual(resOwner.statusCode, 200);

    // 2. Cross-farmer access is blocked with 403 Forbidden
    const resCrossFarmer = mockRes();
    await lotController.getLotById({
      params: { id: validHexId2 }, // Owned by Farmer B
      user: { _id: validHexId1, role: "farmer" } // Farmer A calling
    }, resCrossFarmer);
    assert.strictEqual(resCrossFarmer.statusCode, 403);
    assert.strictEqual(resCrossFarmer.body.message, "Forbidden");

    // 3. Consumer access to internal lot endpoint is blocked with 403 Forbidden
    const resConsumer = mockRes();
    await lotController.getLotById({
      params: { id: validHexId1 },
      user: { _id: validHexId3, role: "consumer" }
    }, resConsumer);
    assert.strictEqual(resConsumer.statusCode, 403);
    assert.strictEqual(resConsumer.body.message, "Forbidden");

    // 4. Admin and Operator can inspect any lot
    const resAdmin = mockRes();
    await lotController.getLotById({
      params: { id: validHexId1 },
      user: { _id: validHexId3, role: "admin" }
    }, resAdmin);
    assert.strictEqual(resAdmin.statusCode, 200);
  });

  await t.test("getLotsByPhone returns 410 Gone deprecation notice", async () => {
    const res = mockRes();
    await lotController.getLotsByPhone({}, res);
    assert.strictEqual(res.statusCode, 410);
  });

  await t.test("getLotByLotId returns public traceability view without leaking farmer data", async () => {
    const res = mockRes();
    await lotLookupController.getLotByLotId({ params: { lotId: "LOT-FARMER-A" } }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.lotId, "LOT-FARMER-A");
    assert.strictEqual(res.body.data.farmerId, undefined);
    assert.strictEqual(res.body.data.farmerName, undefined);
    assert.strictEqual(res.body.data.phone, undefined);
  });
});

// ---------------------------------------------------------------------------
// 4. ORDER CONTROLLER TESTS
// ---------------------------------------------------------------------------
test("Order Controller", async (t) => {
  t.beforeEach(resetDb);

  await t.test("createOrder creates order with valid items and customer details", async () => {
    const req = {
      body: {
        items: [{ lotId: validHexId1, qtyKg: 10 }],
        customerName: "Consumer Charlie",
        phone: "9876543210",
        address: "123 Market St, Chennai"
      },
      user: { _id: validHexId3, role: "consumer" }
    };
    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, "PLACED");
    assert.strictEqual(res.body.data.totalAmount, 400); // 10 kg * ₹40
  });

  await t.test("createOrder rejects insufficient inventory", async () => {
    const req = {
      body: {
        items: [{ lotId: validHexId1, qtyKg: 500 }], // Only 100 kg available
        customerName: "Consumer Charlie",
        phone: "9876543210",
        address: "123 Market St, Chennai"
      },
      user: { _id: validHexId3, role: "consumer" }
    };
    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert(res.body.message.includes("Only 100 kg is currently available"));
  });

  await t.test("createOrder retries on duplicate key collision and recovers with fresh orderId", async () => {
    const origCreate = Order.create;
    let attempts = 0;
    const generatedIds = [];
    Order.create = async (data) => {
      attempts++;
      generatedIds.push(data.orderId);
      if (attempts === 1) {
        const dupErr = new Error("E11000 duplicate key error on orderId");
        dupErr.code = 11000;
        throw dupErr;
      }
      return origCreate(data);
    };

    try {
      const req = {
        body: {
          items: [{ lotId: validHexId1, qtyKg: 5 }],
          customerName: "Consumer Charlie",
          phone: "9876543210",
          address: "123 Market St, Chennai"
        },
        user: { _id: validHexId3, role: "consumer" }
      };
      const res = mockRes();
      await orderController.createOrder(req, res);
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(attempts, 2, "Should have retried once after duplicate key error");
      assert.strictEqual(generatedIds.length, 2);
      assert.notStrictEqual(generatedIds[0], generatedIds[1], "Retried orderId must be fresh");
    } finally {
      Order.create = origCreate;
    }
  });

  await t.test("getOrderById enforces consumer ownership and format validation", async () => {
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-12345",
      customerId: validHexId3,
      status: "PLACED",
      totalAmount: 400,
      items: []
    };
    db.orders.set(validHexId1, orderRecord);

    // 1. Owner consumer gets their order
    const resOwner = mockRes();
    await orderController.getOrderById({
      params: { orderId: "ORD-12345" },
      user: { _id: validHexId3, role: "consumer" }
    }, resOwner);
    assert.strictEqual(resOwner.statusCode, 200);

    // 2. Cross-consumer access returns 403 Forbidden
    const resCross = mockRes();
    await orderController.getOrderById({
      params: { orderId: "ORD-12345" },
      user: { _id: validHexId1, role: "consumer" } // Different user
    }, resCross);
    assert.strictEqual(resCross.statusCode, 403);
    assert.strictEqual(resCross.body.message, "Forbidden");

    // 3. Invalid order ID format returns 400
    const resInvalidFormat = mockRes();
    await orderController.getOrderById({
      params: { orderId: "INVALID-FORMAT" },
      user: { _id: validHexId3, role: "consumer" }
    }, resInvalidFormat);
    assert.strictEqual(resInvalidFormat.statusCode, 400);
  });

  await t.test("updateOrderStatus validates status transition flow", async () => {
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-STATE-TEST",
      customerId: validHexId3,
      status: "PLACED",
      save: async function() { return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    // Valid: PLACED -> CONFIRMED
    const resValid = mockRes();
    await orderController.updateOrderStatus({
      params: { id: "ORD-STATE-TEST" },
      body: { status: "CONFIRMED" },
      user: { role: "operator" }
    }, resValid);
    assert.strictEqual(resValid.statusCode, 200);
    assert.strictEqual(resValid.body.data.status, "CONFIRMED");

    // Invalid: CONFIRMED -> DELIVERED (must go through PACKING and DISPATCHED first)
    const resInvalid = mockRes();
    await orderController.updateOrderStatus({
      params: { id: "ORD-STATE-TEST" },
      body: { status: "DELIVERED" },
      user: { role: "operator" }
    }, resInvalid);
    assert.strictEqual(resInvalid.statusCode, 400);
    assert(resInvalid.body.message.includes("Invalid status transition"));
  });
});

// ---------------------------------------------------------------------------
// 5. PAYMENT CONTROLLER TESTS (HMAC & IDEMPOTENCY)
// ---------------------------------------------------------------------------
test("Payment Controller", async (t) => {
  t.beforeEach(resetDb);

  const testSecret = "test_razorpay_secret_key_12345";
  process.env.RAZORPAY_KEY_SECRET = testSecret;

  await t.test("getLotLedger enforces farmer ownership boundaries", async () => {
    // 1. Farmer owner can view ledger
    const resOwner = mockRes();
    await paymentController.getLotLedger({
      params: { lotId: validHexId1 },
      user: { _id: validHexId1, role: "farmer" }
    }, resOwner);
    assert.strictEqual(resOwner.statusCode, 200);

    // 2. Cross-farmer access returns 403 Forbidden
    const resCross = mockRes();
    await paymentController.getLotLedger({
      params: { lotId: validHexId2 }, // Farmer B's lot
      user: { _id: validHexId1, role: "farmer" } // Farmer A calling
    }, resCross);
    assert.strictEqual(resCross.statusCode, 403);
    assert.strictEqual(resCross.body.message, "Forbidden");

    // 3. Consumer access returns 403 Forbidden
    const resConsumer = mockRes();
    await paymentController.getLotLedger({
      params: { lotId: validHexId1 },
      user: { _id: validHexId3, role: "consumer" }
    }, resConsumer);
    assert.strictEqual(resConsumer.statusCode, 403);
  });

  await t.test("verifyRazorpayPayment validates cryptographic HMAC signature and updates order", async () => {
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-PAY-TEST",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_123" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_123";
    const rpPaymentId = "pay_test_987";
    const validSignature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-PAY-TEST",
        razorpay_order_id: rpOrderId,
        razorpay_payment_id: rpPaymentId,
        razorpay_signature: validSignature
      },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.paymentStatus, "PAID");
    assert.strictEqual(res.body.data.status, "CONFIRMED");

    // Verify inventory was deducted
    const updatedLot = db.lots.get(validHexId1);
    assert.strictEqual(updatedLot.remainingQtyKg, 90); // 100 - 10
  });

  await t.test("verifyRazorpayPayment rejects tampered HMAC signature", async () => {
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-PAY-TAMPER",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_tamper" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-PAY-TAMPER",
        razorpay_order_id: "order_rp_tamper",
        razorpay_payment_id: "pay_test_tamper",
        razorpay_signature: "invalid_tampered_signature"
      },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.message, "Invalid payment signature");
  });

  await t.test("verifyRazorpayPayment idempotency: repeated verification does not double-deduct inventory", async () => {
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-IDEMPOTENT",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PAID", // Already marked PAID
      status: "CONFIRMED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_paid" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_paid";
    const rpPaymentId = "pay_test_repeat";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    const lotBefore = db.lots.get(validHexId1).remainingQtyKg;

    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-IDEMPOTENT",
        razorpay_order_id: rpOrderId,
        razorpay_payment_id: rpPaymentId,
        razorpay_signature: signature
      },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.paymentStatus, "PAID");

    const lotAfter = db.lots.get(validHexId1).remainingQtyKg;
    assert.strictEqual(lotAfter, lotBefore, "Inventory must NOT be deducted again on repeated verification");
  });

  await t.test("verifyHmacSignature constant-time comparison handles valid, tampered, truncated, non-hex, and malformed inputs", () => {
    const valid = crypto.createHmac("sha256", testSecret).update("order_1|pay_1").digest("hex");
    const sameLenTampered = valid.substring(0, valid.length - 1) + (valid.endsWith("a") ? "b" : "a");
    const truncated = valid.substring(0, 32);
    const nonHexSameLen = "Z".repeat(valid.length);

    // Exact match returns true
    assert.strictEqual(paymentController.verifyHmacSignature(valid, valid), true);

    // Tampered same length returns false without throwing
    assert.strictEqual(paymentController.verifyHmacSignature(valid, sameLenTampered), false);

    // Truncated returns false without throwing
    assert.strictEqual(paymentController.verifyHmacSignature(valid, truncated), false);

    // Non-hex returns false without throwing
    assert.strictEqual(paymentController.verifyHmacSignature(valid, nonHexSameLen), false);

    // Malformed / non-string types return false without throwing
    assert.strictEqual(paymentController.verifyHmacSignature(valid, null), false);
    assert.strictEqual(paymentController.verifyHmacSignature(valid, undefined), false);
    assert.strictEqual(paymentController.verifyHmacSignature(null, valid), false);
    assert.strictEqual(paymentController.verifyHmacSignature(valid, 12345), false);
    assert.strictEqual(paymentController.verifyHmacSignature(valid, {}), false);
    assert.strictEqual(paymentController.verifyHmacSignature("", valid), false);
  });

  await t.test("verifyRazorpayPayment enforces strict order binding and rejects mismatched orderId", async () => {
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-BINDING-TEST",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_legit" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const attackerRpOrderId = "order_rp_attacker_spoof";
    const rpPaymentId = "pay_test_binding";
    const signatureForAttacker = crypto
      .createHmac("sha256", testSecret)
      .update(`${attackerRpOrderId}|${rpPaymentId}`)
      .digest("hex");

    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-BINDING-TEST",
        razorpay_order_id: attackerRpOrderId,
        razorpay_payment_id: rpPaymentId,
        razorpay_signature: signatureForAttacker
      },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.message, "Order id mismatch");
  });

  await t.test("verifyRazorpayPayment rejects manipulated payment amount and currency", async () => {
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-AMOUNT-TEST",
      customerId: validHexId3,
      totalAmount: 400, // 40000 paise
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_amt" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_amt";
    const rpPaymentId = "pay_test_amt";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    // 1. Manipulated amount
    const resBadAmt = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-AMOUNT-TEST",
        razorpay_order_id: rpOrderId,
        razorpay_payment_id: rpPaymentId,
        razorpay_signature: signature,
        amount: 100 // 100 paise !== 40000 paise
      },
      user: { _id: validHexId3, role: "consumer" }
    }, resBadAmt);
    assert.strictEqual(resBadAmt.statusCode, 400);
    assert.strictEqual(resBadAmt.body.message, "Payment amount mismatch");

    // 2. Manipulated currency
    const resBadCurr = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-AMOUNT-TEST",
        razorpay_order_id: rpOrderId,
        razorpay_payment_id: rpPaymentId,
        razorpay_signature: signature,
        currency: "USD"
      },
      user: { _id: validHexId3, role: "consumer" }
    }, resBadCurr);
    assert.strictEqual(resBadCurr.statusCode, 400);
    assert.strictEqual(resBadCurr.body.message, "Payment currency mismatch");
  });

  await t.test("verifyRazorpayPayment handles remote Razorpay payment fetch mismatch", async () => {
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-REMOTE-TEST",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_remote" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_remote";
    const rpPaymentId = "pay_test_remote";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    razorpayConfig.razorpay.payments._mockPayment = {
      id: rpPaymentId,
      order_id: rpOrderId,
      amount: 50000, // Remote Razorpay record has 50000 paise instead of 40000
      currency: "INR",
      status: "captured"
    };

    try {
      const res = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: {
          orderId: "ORD-REMOTE-TEST",
          razorpay_order_id: rpOrderId,
          razorpay_payment_id: rpPaymentId,
          razorpay_signature: signature
        },
        user: { _id: validHexId3, role: "consumer" }
      }, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, "Payment amount mismatch");
    } finally {
      razorpayConfig.razorpay.payments._mockPayment = null;
    }
  });

  await t.test("verifyRazorpayPayment handles stock exhaustion post-capture: triggers automated refund and returns 409", async () => {
    // Deplete lot stock before verification
    const lotRecord = db.lots.get(validHexId1);
    lotRecord.remainingQtyKg = 5; // Only 5 kg left, but order requests 10 kg
    lotRecord.qtyKg = 5;

    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-STOCK-EXHAUSTED",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_exhausted" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_exhausted";
    const rpPaymentId = "pay_exhausted_123";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-STOCK-EXHAUSTED",
        razorpay_order_id: rpOrderId,
        razorpay_payment_id: rpPaymentId,
        razorpay_signature: signature
      },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.code, "STOCK_EXHAUSTED");
    assert.strictEqual(res.body.data.paymentStatus, "REFUNDED");
    assert.strictEqual(res.body.data.refund.status, "PROCESSED");
    assert.strictEqual(res.body.data.refund.reason, "STOCK_EXHAUSTED");

    // Inventory must NOT be decremented
    assert.strictEqual(db.lots.get(validHexId1).remainingQtyKg, 5);

    // Order state must be CANCELLED and REFUNDED with payment details preserved
    const updatedOrder = db.orders.get(validHexId1);
    assert.strictEqual(updatedOrder.status, "CANCELLED");
    assert.strictEqual(updatedOrder.paymentStatus, "REFUNDED");
    assert.strictEqual(updatedOrder.razorpay.paymentId, rpPaymentId);

    // Alert notification created for customer
    const alertNotif = db.notifications.find(n => n.type === "ALERT" && n.relatedId === "ORD-STOCK-EXHAUSTED");
    assert(alertNotif, "Customer ALERT notification must be dispatched");
    assert(alertNotif.message.includes("automatically refunded"));
  });

  await t.test("verifyRazorpayPayment stock exhaustion with refund API failure sets REFUND_FAILED", async () => {
    const lotRecord = db.lots.get(validHexId1);
    lotRecord.remainingQtyKg = 0; // 0 kg left
    lotRecord.qtyKg = 0;

    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-REFUND-FAIL",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_rfndfail" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_rfndfail";
    const rpPaymentId = "pay_rfndfail_456";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    // Stub refund to simulate API failure
    const origRefund = razorpayConfig.razorpay.payments.refund;
    razorpayConfig.razorpay.payments.refund = async () => {
      throw new Error("Razorpay network timeout");
    };

    try {
      const res = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: {
          orderId: "ORD-REFUND-FAIL",
          razorpay_order_id: rpOrderId,
          razorpay_payment_id: rpPaymentId,
          razorpay_signature: signature
        },
        user: { _id: validHexId3, role: "consumer" }
      }, res);

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.body.code, "STOCK_EXHAUSTED");
      assert.strictEqual(res.body.data.paymentStatus, "REFUND_FAILED");
      assert.strictEqual(res.body.data.refund.status, "FAILED");
      assert.strictEqual(res.body.data.refund.error, "Razorpay network timeout");

      const alertNotif = db.notifications.find(n => n.type === "ALERT" && n.relatedId === "ORD-REFUND-FAIL");
      assert(alertNotif, "Alert notification must be created for operator manual review");
      assert(alertNotif.message.includes("manual"));
    } finally {
      razorpayConfig.razorpay.payments.refund = origRefund;
    }
  });

  await t.test("verifyRazorpayPayment idempotency on already REFUNDED order does not re-refund or alter stock", async () => {
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-ALREADY-REFUNDED",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "REFUNDED",
      status: "CANCELLED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_alr_rfnd" },
      refund: { refundId: "rfnd_existing_999", amount: 400, status: "PROCESSED", reason: "STOCK_EXHAUSTED" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_alr_rfnd";
    const rpPaymentId = "pay_repeat_rfnd";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    const lotBefore = db.lots.get(validHexId1).remainingQtyKg;

    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-ALREADY-REFUNDED",
        razorpay_order_id: rpOrderId,
        razorpay_payment_id: rpPaymentId,
        razorpay_signature: signature
      },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.code, "STOCK_EXHAUSTED");
    assert.strictEqual(res.body.data.paymentStatus, "REFUNDED");
    assert.strictEqual(res.body.data.refund.refundId, "rfnd_existing_999");

    const lotAfter = db.lots.get(validHexId1).remainingQtyKg;
    assert.strictEqual(lotAfter, lotBefore, "Inventory must remain unchanged");
  });

  await t.test("verifyRazorpayPayment replay on CANCELLED / REFUND_FAILED order with restocked inventory does NOT allocate stock or transition to CONFIRMED", async () => {
    // 1. Setup order in CANCELLED / REFUND_FAILED state
    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-REPLAY-RESTOCKED",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "REFUND_FAILED",
      status: "CANCELLED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_replay_restocked" },
      refund: { status: "FAILED", reason: "STOCK_EXHAUSTED" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    // 2. Restock lot with 500 kg (ample inventory)
    const lotRecord = db.lots.get(validHexId1);
    lotRecord.remainingQtyKg = 500;
    lotRecord.qtyKg = 500;

    const rpOrderId = "order_rp_replay_restocked";
    const rpPaymentId = "pay_replay_restocked_123";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    // 3. Customer or attacker replays verification request
    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-REPLAY-RESTOCKED",
        razorpay_order_id: rpOrderId,
        razorpay_payment_id: rpPaymentId,
        razorpay_signature: signature
      },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    // 4. Assertions:
    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.code, "STOCK_EXHAUSTED");

    // Order status must remain CANCELLED, NEVER CONFIRMED
    const updatedOrder = db.orders.get(validHexId1);
    assert.strictEqual(updatedOrder.status, "CANCELLED");
    assert.notStrictEqual(updatedOrder.status, "CONFIRMED");

    // Inventory MUST NOT be decremented (remains 500 kg)
    assert.strictEqual(db.lots.get(validHexId1).remainingQtyKg, 500);

    // Payment/refund status is reconciled
    assert.strictEqual(updatedOrder.paymentStatus, "REFUNDED");
    assert.strictEqual(updatedOrder.refund.status, "PROCESSED");
  });

  await t.test("verifyRazorpayPayment maps gateway refund status 'pending' to REFUND_PENDING and PENDING", async () => {
    const lotRecord = db.lots.get(validHexId1);
    lotRecord.remainingQtyKg = 0;
    lotRecord.qtyKg = 0;

    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-REFUND-PENDING-GW",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_rfnd_pending" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_rfnd_pending";
    const rpPaymentId = "pay_rfnd_pending_789";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    razorpayConfig.razorpay._mockRefundStatus = "pending";

    try {
      const res = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: {
          orderId: "ORD-REFUND-PENDING-GW",
          razorpay_order_id: rpOrderId,
          razorpay_payment_id: rpPaymentId,
          razorpay_signature: signature
        },
        user: { _id: validHexId3, role: "consumer" }
      }, res);

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.body.code, "STOCK_EXHAUSTED");
      assert.strictEqual(res.body.data.paymentStatus, "REFUND_PENDING");
      assert.strictEqual(res.body.data.refund.status, "PENDING");
      assert.strictEqual(res.body.data.refund.reason, "STOCK_EXHAUSTED");
      assert(res.body.data.refund.refundId, "Must have recorded refundId from gateway");

      const updatedOrder = db.orders.get(validHexId1);
      assert.strictEqual(updatedOrder.status, "CANCELLED");
      assert.strictEqual(updatedOrder.paymentStatus, "REFUND_PENDING");

      const alertNotif = db.notifications.find(n => n.type === "ALERT" && n.relatedId === "ORD-REFUND-PENDING-GW");
      assert(alertNotif, "Alert notification must exist");
      assert(alertNotif.message.includes("pending"));
    } finally {
      razorpayConfig.razorpay._mockRefundStatus = "processed";
    }
  });

  await t.test("verifyRazorpayPayment recovers from in-flight refund without issuing duplicate refund", async () => {
    const existingRefundId = "rfnd_inflight_existing_444";
    const rpOrderId = "order_rp_inflight";
    const rpPaymentId = "pay_inflight_555";

    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-INFLIGHT-RECOVER",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "REFUND_PENDING",
      status: "CANCELLED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: rpOrderId, paymentId: rpPaymentId },
      refund: { initiatedAt: new Date(), reason: "STOCK_EXHAUSTED" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    razorpayConfig.razorpay._refunds = [{
      id: existingRefundId,
      payment_id: rpPaymentId,
      amount: 40000,
      status: "processed"
    }];

    let refundApiCallCount = 0;
    const origRefund = razorpayConfig.razorpay.payments.refund;
    razorpayConfig.razorpay.payments.refund = async (...args) => {
      refundApiCallCount++;
      return origRefund.apply(razorpayConfig.razorpay.payments, args);
    };

    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    try {
      const res = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: {
          orderId: "ORD-INFLIGHT-RECOVER",
          razorpay_order_id: rpOrderId,
          razorpay_payment_id: rpPaymentId,
          razorpay_signature: signature
        },
        user: { _id: validHexId3, role: "consumer" }
      }, res);

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.body.code, "STOCK_EXHAUSTED");
      assert.strictEqual(res.body.data.paymentStatus, "REFUNDED");
      assert.strictEqual(res.body.data.refund.status, "PROCESSED");
      assert.strictEqual(res.body.data.refund.refundId, existingRefundId);
      assert.strictEqual(refundApiCallCount, 0, "Must NOT call payments.refund when refund already exists at gateway");
    } finally {
      razorpayConfig.razorpay.payments.refund = origRefund;
      razorpayConfig.razorpay._refunds = [];
    }
  });

  await t.test("verifyRazorpayPayment decoupled transaction ensures zero external refund call when transaction aborts", async () => {
    const lotRecord = db.lots.get(validHexId1);
    lotRecord.remainingQtyKg = 0;

    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-TX-ABORT",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_tx_abort" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_tx_abort";
    const rpPaymentId = "pay_tx_abort_666";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    let refundApiCallCount = 0;
    const origRefund = razorpayConfig.razorpay.payments.refund;
    razorpayConfig.razorpay.payments.refund = async (...args) => {
      refundApiCallCount++;
      return origRefund.apply(razorpayConfig.razorpay.payments, args);
    };

    const origStartSession = mongoose.startSession;
    mongoose.startSession = async () => ({
      withTransaction: async () => {
        throw new Error("Simulated transient MongoDB transaction commit error");
      },
      endSession: async () => {}
    });

    try {
      const res = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: {
          orderId: "ORD-TX-ABORT",
          razorpay_order_id: rpOrderId,
          razorpay_payment_id: rpPaymentId,
          razorpay_signature: signature
        },
        user: { _id: validHexId3, role: "consumer" }
      }, res);

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(refundApiCallCount, 0, "External refund API must NEVER be called if MongoDB transaction fails");
    } finally {
      mongoose.startSession = origStartSession;
      razorpayConfig.razorpay.payments.refund = origRefund;
    }
  });

  await t.test("concurrent verification calls on stock-exhausted order acquire lease and prevent double refund", async () => {
    const lotRecord = db.lots.get(validHexId1);
    lotRecord.remainingQtyKg = 0;
    lotRecord.qtyKg = 0;

    const orderRecord = {
      _id: validHexId1,
      orderId: "ORD-CONCURRENT-REFUND",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_concurrent" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, orderRecord);

    const rpOrderId = "order_rp_concurrent";
    const rpPaymentId = "pay_test_concurrent_999";
    const signature = crypto
      .createHmac("sha256", testSecret)
      .update(`${rpOrderId}|${rpPaymentId}`)
      .digest("hex");

    let refundInvocationCount = 0;
    const origRefund = razorpayConfig.razorpay.payments.refund;
    razorpayConfig.razorpay.payments.refund = async (...args) => {
      refundInvocationCount++;
      await new Promise(r => setTimeout(r, 20));
      return origRefund.apply(razorpayConfig.razorpay.payments, args);
    };

    try {
      const res1 = mockRes();
      const res2 = mockRes();

      await Promise.all([
        paymentController.verifyRazorpayPayment({
          body: {
            orderId: "ORD-CONCURRENT-REFUND",
            razorpay_order_id: rpOrderId,
            razorpay_payment_id: rpPaymentId,
            razorpay_signature: signature
          },
          user: { _id: validHexId3, role: "consumer" }
        }, res1),
        paymentController.verifyRazorpayPayment({
          body: {
            orderId: "ORD-CONCURRENT-REFUND",
            razorpay_order_id: rpOrderId,
            razorpay_payment_id: rpPaymentId,
            razorpay_signature: signature
          },
          user: { _id: validHexId3, role: "consumer" }
        }, res2)
      ]);

      assert.strictEqual(res1.statusCode, 409);
      assert.strictEqual(res2.statusCode, 409);
      assert.strictEqual(refundInvocationCount, 1, "Concurrency lock must prevent duplicate refund invocation");
    } finally {
      razorpayConfig.razorpay.payments.refund = origRefund;
    }
  });

  await t.test("reconcilePendingRefunds recovers orders stuck in REFUND_PENDING", async () => {
    const rpOrderId = "order_rp_stuck";
    const rpPaymentId = "pay_stuck_777";
    const refundId = "rfnd_stuck_recovered_111";

    const stuckOrder = {
      _id: validHexId1,
      orderId: "ORD-STUCK-PENDING",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "REFUND_PENDING",
      status: "CANCELLED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: rpOrderId, paymentId: rpPaymentId },
      refund: {
        status: "PENDING",
        refundId: "",
        leaseExpiresAt: new Date(Date.now() - 10000)
      },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(validHexId1, stuckOrder);

    razorpayConfig.razorpay._refunds = [{
      id: refundId,
      payment_id: rpPaymentId,
      amount: 40000,
      status: "processed"
    }];

    try {
      const result = await paymentController.reconcilePendingRefunds();
      assert.strictEqual(result.reconciledCount, 1, "Should have reconciled 1 stuck order");

      const updated = db.orders.get(validHexId1);
      assert.strictEqual(updated.paymentStatus, "REFUNDED");
      assert.strictEqual(updated.refund.status, "PROCESSED");
      assert.strictEqual(updated.refund.refundId, refundId);
      assert.strictEqual(updated.refund.leaseExpiresAt, null);
    } finally {
      razorpayConfig.razorpay._refunds = [];
    }
  });

  await t.test("reconcileRefundsHandler restricts access and returns summary", async () => {
    const resForbidden = mockRes();
    await paymentController.reconcileRefundsHandler({
      user: { _id: validHexId3, role: "consumer" }
    }, resForbidden);
    assert.strictEqual(resForbidden.statusCode, 403);

    const resAdmin = mockRes();
    await paymentController.reconcileRefundsHandler({
      user: { _id: validHexId1, role: "admin" }
    }, resAdmin);
    assert.strictEqual(resAdmin.statusCode, 200);
    assert.strictEqual(resAdmin.body.success, true);
    assert.strictEqual(typeof resAdmin.body.data.reconciledCount, "number");
  });

  // -------------------------------------------------------------------------
  // SECTION 3 AUTOMATED REGRESSION TESTS: SPECIFIC PAYMENT-SECURITY HARDENING
  // -------------------------------------------------------------------------

  // 1. Invalid signature leaves order and inventory unchanged
  await t.test("Regression 1: Invalid signature leaves order and inventory unchanged with zero DB mutation", async () => {
    const lotId = "507f1f77bcf86cd799439099";
    db.lots.set(lotId, {
      _id: lotId,
      remainingQtyKg: 50,
      qtyKg: 50,
      save: async function() { db.lots.set(lotId, this); return this; }
    });
    const orderId = "507f1f77bcf86cd799439088";
    const ord = {
      _id: orderId,
      orderId: "ORD-SEC-TAMPER-1",
      customerId: validHexId3,
      totalAmount: 200,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId, qtyKg: 10, pricePerKg: 20, total: 200 }],
      razorpay: { orderId: "order_sec_rp_1" },
      save: async function() { db.orders.set(orderId, this); return this; }
    };
    db.orders.set(orderId, ord);

    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: {
        orderId: "ORD-SEC-TAMPER-1",
        razorpay_order_id: "order_sec_rp_1",
        razorpay_payment_id: "pay_tamper_999",
        razorpay_signature: "completely_invalid_hmac_signature"
      },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.message, "Invalid payment signature");
    // Order and lot MUST remain unchanged (zero mutation)
    assert.strictEqual(db.orders.get(orderId).paymentStatus, "PENDING");
    assert.strictEqual(db.orders.get(orderId).status, "PLACED");
    assert.strictEqual(db.lots.get(lotId).remainingQtyKg, 50);
  });

  // 2. Payment verification fails safely when Razorpay is unavailable
  await t.test("Regression 2: Payment verification fails safely when Razorpay is unavailable", async () => {
    const orderId = "507f1f77bcf86cd799439082";
    db.orders.set(orderId, {
      _id: orderId,
      orderId: "ORD-SEC-NO-GATEWAY-2",
      customerId: validHexId3,
      totalAmount: 200,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 20, total: 200 }],
      razorpay: { orderId: "order_sec_rp_2" },
      save: async function() { db.orders.set(orderId, this); return this; }
    });

    const origCreds = razorpayConfig.hasCredentials;
    razorpayConfig.hasCredentials = false;

    try {
      const res = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: {
          orderId: "ORD-SEC-NO-GATEWAY-2",
          razorpay_order_id: "order_sec_rp_2",
          razorpay_payment_id: "pay_sec_rp_2",
          razorpay_signature: crypto.createHmac("sha256", testSecret).update("order_sec_rp_2|pay_sec_rp_2").digest("hex")
        },
        user: { _id: validHexId3, role: "consumer" }
      }, res);

      assert.strictEqual(res.statusCode, 502);
      assert.strictEqual(res.body.message, "Payment verification failed with gateway");
      assert.strictEqual(db.orders.get(orderId).paymentStatus, "PENDING");
    } finally {
      razorpayConfig.hasCredentials = origCreds;
    }
  });

  // 3. Payment verification rejects incorrect order ID, amount, currency, or uncaptured payment
  await t.test("Regression 3: Payment verification rejects incorrect order ID, amount, currency, or uncaptured payment", async () => {
    const orderId = "507f1f77bcf86cd799439077";
    const ord = {
      _id: orderId,
      orderId: "ORD-SEC-MISMATCH-3",
      customerId: validHexId3,
      totalAmount: 300,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 5, pricePerKg: 60, total: 300 }],
      razorpay: { orderId: "order_rp_sec_3" },
      save: async function() { db.orders.set(orderId, this); return this; }
    };
    db.orders.set(orderId, ord);

    const validSig = crypto.createHmac("sha256", testSecret).update("order_rp_sec_3|pay_sec_3").digest("hex");

    // Case 3a: remote order_id mismatch
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_sec_3",
      order_id: "wrong_order_rp_999",
      amount: 30000,
      currency: "INR",
      status: "captured"
    };
    const res3a = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: "ORD-SEC-MISMATCH-3", razorpay_order_id: "order_rp_sec_3", razorpay_payment_id: "pay_sec_3", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, res3a);
    assert.strictEqual(res3a.statusCode, 400);
    assert.strictEqual(res3a.body.message, "Order id mismatch");

    // Case 3b: remote amount mismatch
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_sec_3",
      order_id: "order_rp_sec_3",
      amount: 10000, // Expected 30000
      currency: "INR",
      status: "captured"
    };
    const res3b = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: "ORD-SEC-MISMATCH-3", razorpay_order_id: "order_rp_sec_3", razorpay_payment_id: "pay_sec_3", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, res3b);
    assert.strictEqual(res3b.statusCode, 400);
    assert.strictEqual(res3b.body.message, "Payment amount mismatch");

    // Case 3c: remote currency mismatch
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_sec_3",
      order_id: "order_rp_sec_3",
      amount: 30000,
      currency: "USD",
      status: "captured"
    };
    const res3c = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: "ORD-SEC-MISMATCH-3", razorpay_order_id: "order_rp_sec_3", razorpay_payment_id: "pay_sec_3", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, res3c);
    assert.strictEqual(res3c.statusCode, 400);
    assert.strictEqual(res3c.body.message, "Payment currency mismatch");

    // Case 3d: uncaptured payment status (e.g. 'authorized')
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_sec_3",
      order_id: "order_rp_sec_3",
      amount: 30000,
      currency: "INR",
      status: "authorized"
    };
    const res3d = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: "ORD-SEC-MISMATCH-3", razorpay_order_id: "order_rp_sec_3", razorpay_payment_id: "pay_sec_3", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, res3d);
    assert.strictEqual(res3d.statusCode, 400);
    assert.strictEqual(res3d.body.message, "Payment is not captured");

    // Order must NOT be marked paid after any mismatch
    assert.strictEqual(db.orders.get(orderId).paymentStatus, "PENDING");
    razorpayConfig.razorpay.payments._mockPayment = null;
  });

  // 4. Gateway lookup errors never mark orders as paid
  await t.test("Regression 4: Gateway lookup errors never mark orders as paid", async () => {
    const orderId = "507f1f77bcf86cd799439066";
    const ord = {
      _id: orderId,
      orderId: "ORD-SEC-LOOKUP-ERR",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 10, pricePerKg: 40, total: 400 }],
      razorpay: { orderId: "order_rp_sec_4" },
      save: async function() { db.orders.set(orderId, this); return this; }
    };
    db.orders.set(orderId, ord);

    const validSig = crypto.createHmac("sha256", testSecret).update("order_rp_sec_4|pay_sec_4").digest("hex");
    razorpayConfig.razorpay.payments._mockPaymentError = new Error("Gateway connection reset (ECONNRESET)");

    try {
      const res = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: { orderId: "ORD-SEC-LOOKUP-ERR", razorpay_order_id: "order_rp_sec_4", razorpay_payment_id: "pay_sec_4", razorpay_signature: validSig },
        user: { _id: validHexId3, role: "consumer" }
      }, res);

      assert.strictEqual(res.statusCode, 502);
      assert.strictEqual(res.body.message, "Payment verification failed with gateway");
      assert.strictEqual(db.orders.get(orderId).paymentStatus, "PENDING");
      assert.strictEqual(db.orders.get(orderId).status, "PLACED");
    } finally {
      razorpayConfig.razorpay.payments._mockPaymentError = null;
    }
  });

  // 5. Refund cannot be dispatched without confirmed atomic lease
  await t.test("Regression 5: Refund cannot be dispatched without confirmed atomic lease", async () => {
    const order = {
      _id: "507f1f77bcf86cd799439055",
      orderId: "ORD-SEC-NO-LEASE",
      customerId: validHexId3,
      totalAmount: 100,
      paymentStatus: "REFUND_PENDING",
      status: "CANCELLED",
      refund: { status: "PENDING", refundId: "" },
      save: async function() { return this; }
    };

    let refundDispatched = false;
    const origRefund = razorpayConfig.razorpay.payments.refund;
    razorpayConfig.razorpay.payments.refund = async () => {
      refundDispatched = true;
      return { id: "rfnd_should_not_happen", status: "processed" };
    };

    // Simulate Order.findOneAndUpdate failing/unavailable
    const origFindOneAndUpdate = Order.findOneAndUpdate;
    Order.findOneAndUpdate = async () => null; // lease cannot be acquired

    try {
      const res = await paymentController.processOrReconcileRefund({
        order,
        cleanRpPaymentId: "pay_no_lease_1",
        refundAmountPaise: 10000,
        exhaustedCrop: "Wheat"
      });

      assert.strictEqual(refundDispatched, false, "Must NOT dispatch refund without confirmed atomic lease");
      assert.strictEqual(res.refundStatus, "PENDING");
    } finally {
      Order.findOneAndUpdate = origFindOneAndUpdate;
      razorpayConfig.razorpay.payments.refund = origRefund;
    }
  });

  // 6. Concurrent refund attempts do not issue duplicate refunds
  await t.test("Regression 6: Concurrent refund attempts do not issue duplicate refunds", async () => {
    let refundCallCount = 0;
    const origRefund = razorpayConfig.razorpay.payments.refund;
    razorpayConfig.razorpay.payments.refund = async () => {
      refundCallCount++;
      return { id: "rfnd_single_dispatch_6", status: "processed" };
    };

    const orderRecord = {
      _id: "507f1f77bcf86cd799439044",
      orderId: "ORD-CONCURRENT-6",
      customerId: validHexId3,
      totalAmount: 200,
      paymentStatus: "REFUND_PENDING",
      status: "CANCELLED",
      refund: { status: "PENDING", leaseExpiresAt: null },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(orderRecord._id, orderRecord);

    try {
      const [r1, r2] = await Promise.all([
        paymentController.processOrReconcileRefund({
          order: orderRecord,
          cleanRpPaymentId: "pay_conc_6",
          refundAmountPaise: 20000,
          exhaustedCrop: "Tomatoes"
        }),
        paymentController.processOrReconcileRefund({
          order: orderRecord,
          cleanRpPaymentId: "pay_conc_6",
          refundAmountPaise: 20000,
          exhaustedCrop: "Tomatoes"
        })
      ]);

      assert.strictEqual(refundCallCount, 1, "Only one refund API call must be dispatched across concurrent workers");
    } finally {
      razorpayConfig.razorpay.payments.refund = origRefund;
    }
  });

  // 7. Ambiguous refund timeout triggers reconciliation instead of blind retry
  await t.test("Regression 7: Ambiguous refund timeout triggers reconciliation instead of blind retry", async () => {
    let refundDispatchCount = 0;
    const origRefund = razorpayConfig.razorpay.payments.refund;
    razorpayConfig.razorpay.payments.refund = async () => {
      refundDispatchCount++;
      throw new Error("ETIMEDOUT: Gateway network timeout on refund creation");
    };

    const orderRecord = {
      _id: "507f1f77bcf86cd799439033",
      orderId: "ORD-TIMEOUT-7",
      customerId: validHexId3,
      totalAmount: 500,
      paymentStatus: "REFUND_PENDING",
      status: "CANCELLED",
      refund: { status: "PENDING", leaseExpiresAt: null },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(orderRecord._id, orderRecord);

    try {
      const res = await paymentController.processOrReconcileRefund({
        order: orderRecord,
        cleanRpPaymentId: "pay_timeout_7",
        refundAmountPaise: 50000,
        exhaustedCrop: "Rice"
      });

      assert.strictEqual(refundDispatchCount, 1, "Must dispatch exactly once, never blind retry");
      assert.strictEqual(res.refundStatus, "FAILED");
      assert.strictEqual(orderRecord.paymentStatus, "REFUND_FAILED");
    } finally {
      razorpayConfig.razorpay.payments.refund = origRefund;
    }
  });

  // 8. Refund matching never succeeds based on amount alone
  await t.test("Regression 8: Refund matching never succeeds based on amount alone", async () => {
    const orderRecord = {
      _id: "507f1f77bcf86cd799439022",
      orderId: "ORD-STRICT-MATCH-8",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "REFUND_PENDING",
      status: "CANCELLED",
      refund: { status: "PENDING", refundId: "" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(orderRecord._id, orderRecord);

    // Gateway returns a refund with amount 40000 but from a COMPLETELY DIFFERENT order and payment
    razorpayConfig.razorpay._refunds = [{
      id: "rfnd_foreign_customer_999",
      payment_id: "pay_foreign_999", // Different payment!
      amount: 40000, // Same amount!
      status: "processed",
      notes: { orderId: "ORD-FOREIGN-999" }
    }];

    let newRefundIssued = false;
    const origRefund = razorpayConfig.razorpay.payments.refund;
    razorpayConfig.razorpay.payments.refund = async () => {
      newRefundIssued = true;
      return { id: "rfnd_legit_888", status: "processed" };
    };

    try {
      const res = await paymentController.processOrReconcileRefund({
        order: orderRecord,
        cleanRpPaymentId: "pay_legit_888",
        refundAmountPaise: 40000,
        exhaustedCrop: "Onions"
      });

      // Must NOT match foreign refund
      assert.notStrictEqual(res.refund?.refundId, "rfnd_foreign_customer_999");
      assert.strictEqual(newRefundIssued, true, "Must issue legit refund instead of adopting foreign refund with matching amount");
    } finally {
      razorpayConfig.razorpay._refunds = [];
      razorpayConfig.razorpay.payments.refund = origRefund;
    }
  });

  // 9. Unknown refund statuses are not marked processed
  await t.test("Regression 9: Unknown refund statuses are not marked processed", async () => {
    const orderRecord = {
      _id: "507f1f77bcf86cd799439011",
      orderId: "ORD-UNKNOWN-STATUS-9",
      customerId: validHexId3,
      totalAmount: 300,
      paymentStatus: "REFUND_PENDING",
      status: "CANCELLED",
      refund: { status: "PENDING", refundId: "" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(orderRecord._id, orderRecord);

    // Gateway returns refund with non-standard status
    razorpayConfig.razorpay._refunds = [{
      id: "rfnd_unknown_status_999",
      payment_id: "pay_unknown_9",
      amount: 30000,
      status: "partially_reversed" // Unknown status!
    }];

    try {
      const res = await paymentController.processOrReconcileRefund({
        order: orderRecord,
        cleanRpPaymentId: "pay_unknown_9",
        refundAmountPaise: 30000,
        exhaustedCrop: "Corn"
      });

      assert.strictEqual(res.refundSuccess, false);
      assert.notStrictEqual(res.refundStatus, "PROCESSED", "Must never mark unknown refund status as PROCESSED");
      assert.strictEqual(res.refundStatus, "PENDING");
    } finally {
      razorpayConfig.razorpay._refunds = [];
    }
  });

  // 10. Reconciliation is idempotent
  await t.test("Regression 10: Reconciliation is idempotent", async () => {
    const rpPaymentId = "pay_reconcile_idem_10";
    const stuckOrder = {
      _id: "507f1f77bcf86cd799439000",
      orderId: "ORD-IDEM-RECON-10",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "REFUND_PENDING",
      status: "CANCELLED",
      razorpay: { paymentId: rpPaymentId },
      refund: { status: "PENDING", refundId: "" },
      save: async function() { db.orders.set(String(this._id), this); return this; }
    };
    db.orders.set(stuckOrder._id, stuckOrder);

    razorpayConfig.razorpay._refunds = [{
      id: "rfnd_idem_10",
      payment_id: rpPaymentId,
      amount: 40000,
      status: "processed"
    }];

    try {
      const res1 = await paymentController.reconcilePendingRefunds();
      assert.strictEqual(res1.reconciledCount, 1);
      assert.strictEqual(db.orders.get(stuckOrder._id).paymentStatus, "REFUNDED");

      // Second run on already reconciled order: idempotent
      const res2 = await paymentController.reconcilePendingRefunds();
      assert.strictEqual(res2.reconciledCount, 0, "Second reconciliation run must do nothing");
      assert.strictEqual(db.orders.get(stuckOrder._id).paymentStatus, "REFUNDED");
    } finally {
      razorpayConfig.razorpay._refunds = [];
    }
  });

  // 11. Concurrent purchases cannot oversell inventory
  await t.test("Regression 11: Concurrent purchases cannot oversell inventory", async () => {
    const sharedLotId = "507f1f77bcf86cd7994390aa";
    db.lots.set(sharedLotId, {
      _id: sharedLotId,
      crop: "Apples",
      remainingQtyKg: 15, // Only 15kg in stock!
      qtyKg: 15,
      sales: [],
      events: [],
      hubId: validHexHub,
      save: async function() { db.lots.set(sharedLotId, this); return this; }
    });

    const ordAId = "507f1f77bcf86cd7994390bb";
    const ordBId = "507f1f77bcf86cd7994390cc";

    db.orders.set(ordAId, {
      _id: ordAId,
      orderId: "ORD-CONC-BUY-A",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: sharedLotId, qtyKg: 10, pricePerKg: 40, total: 400 }], // 10kg
      razorpay: { orderId: "order_rp_conc_a" },
      save: async function() { db.orders.set(ordAId, this); return this; }
    });

    db.orders.set(ordBId, {
      _id: ordBId,
      orderId: "ORD-CONC-BUY-B",
      customerId: validHexId3,
      totalAmount: 400,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: sharedLotId, qtyKg: 10, pricePerKg: 40, total: 400 }], // 10kg (10 + 10 = 20kg > 15kg!)
      razorpay: { orderId: "order_rp_conc_b" },
      save: async function() { db.orders.set(ordBId, this); return this; }
    });

    const sigA = crypto.createHmac("sha256", testSecret).update("order_rp_conc_a|pay_conc_a").digest("hex");
    const sigB = crypto.createHmac("sha256", testSecret).update("order_rp_conc_b|pay_conc_b").digest("hex");

    const resA = mockRes();
    const resB = mockRes();

    await Promise.all([
      paymentController.verifyRazorpayPayment({
        body: { orderId: "ORD-CONC-BUY-A", razorpay_order_id: "order_rp_conc_a", razorpay_payment_id: "pay_conc_a", razorpay_signature: sigA },
        user: { _id: validHexId3, role: "consumer" }
      }, resA),
      paymentController.verifyRazorpayPayment({
        body: { orderId: "ORD-CONC-BUY-B", razorpay_order_id: "order_rp_conc_b", razorpay_payment_id: "pay_conc_b", razorpay_signature: sigB },
        user: { _id: validHexId3, role: "consumer" }
      }, resB)
    ]);

    const statuses = [resA.statusCode, resB.statusCode];
    // Exactly ONE should succeed (200) and ONE should fail due to stock exhaustion (409)
    assert(statuses.includes(200), "One order must succeed");
    assert(statuses.includes(409), "One order must be rejected with 409 STOCK_EXHAUSTED");

    // Stock must be 5kg, NEVER negative!
    const remainingStock = db.lots.get(sharedLotId).remainingQtyKg;
    assert.strictEqual(remainingStock, 5, "Remaining stock must be 15 - 10 = 5kg, never oversold");
  });

  // 12. Duplicate payment-order creation is safely handled
  await t.test("Regression 12: Duplicate payment-order creation is safely handled", async () => {
    const orderId = "507f1f77bcf86cd7994390dd";
    const ord = {
      _id: orderId,
      orderId: "ORD-CREATE-RP-12",
      customerId: validHexId3,
      totalAmount: 250,
      paymentStatus: "PENDING",
      status: "PLACED",
      save: async function() { db.orders.set(orderId, this); return this; }
    };
    db.orders.set(orderId, ord);

    const res1 = mockRes();
    await paymentController.createRazorpayOrder({
      body: { orderId: "ORD-CREATE-RP-12" },
      user: { _id: validHexId3, role: "consumer" }
    }, res1);
    assert.strictEqual(res1.statusCode, 200);
    const firstRpOrderId = res1.body.data.id;
    assert(firstRpOrderId);

    // Call create-order a second time: must return same rpOrderId idempotently
    const res2 = mockRes();
    await paymentController.createRazorpayOrder({
      body: { orderId: "ORD-CREATE-RP-12" },
      user: { _id: validHexId3, role: "consumer" }
    }, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body.data.id, firstRpOrderId, "Second call must return identical Razorpay order ID idempotently");

    // Attempt create-order on cancelled order -> 400
    ord.status = "CANCELLED";
    const resCancelled = mockRes();
    await paymentController.createRazorpayOrder({
      body: { orderId: "ORD-CREATE-RP-12" },
      user: { _id: validHexId3, role: "consumer" }
    }, resCancelled);
    assert.strictEqual(resCancelled.statusCode, 400);
  });

  // 13. Unauthorized users cannot access other customers' orders or invoke admin reconciliation
  await t.test("Regression 13: Unauthorized users cannot access other customers' orders or invoke admin reconciliation", async () => {
    const orderId = "507f1f77bcf86cd7994390ee";
    const victimCustomerId = "507f1f77bcf86cd799439011";
    const attackerCustomerId = "507f1f77bcf86cd799439022";

    db.orders.set(orderId, {
      _id: orderId,
      orderId: "ORD-AUTH-13",
      customerId: victimCustomerId,
      totalAmount: 100,
      paymentStatus: "PENDING",
      status: "PLACED",
      razorpay: { orderId: "order_rp_auth_13" },
      save: async function() { db.orders.set(orderId, this); return this; }
    });

    // Attacker tries to create payment order for victim
    const resAttackerCreate = mockRes();
    await paymentController.createRazorpayOrder({
      body: { orderId: "ORD-AUTH-13" },
      user: { _id: attackerCustomerId, role: "consumer" }
    }, resAttackerCreate);
    assert.strictEqual(resAttackerCreate.statusCode, 403);

    // Attacker tries to verify payment for victim
    const sig = crypto.createHmac("sha256", testSecret).update("order_rp_auth_13|pay_13").digest("hex");
    const resAttackerVerify = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: "ORD-AUTH-13", razorpay_order_id: "order_rp_auth_13", razorpay_payment_id: "pay_13", razorpay_signature: sig },
      user: { _id: attackerCustomerId, role: "consumer" }
    }, resAttackerVerify);
    assert.strictEqual(resAttackerVerify.statusCode, 403);

    // Non-admin consumer tries to invoke reconcile refunds
    const resAttackerReconcile = mockRes();
    await paymentController.reconcileRefundsHandler({
      user: { _id: attackerCustomerId, role: "consumer" }
    }, resAttackerReconcile);
    assert.strictEqual(resAttackerReconcile.statusCode, 403);
  });

  // 14. Error responses do not leak internal details
  await t.test("Regression 14: Error responses do not leak internal details or stack traces", async () => {
    const orderId = "507f1f77bcf86cd7994390ff";
    const validSig = crypto.createHmac("sha256", testSecret).update("order_rp_leak_14|pay_leak_14").digest("hex");

    // Order whose save method throws a sensitive database error with credentials/paths
    db.orders.set(orderId, {
      _id: orderId,
      orderId: "ORD-LEAK-TEST-14",
      customerId: validHexId3,
      totalAmount: 100,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 1, pricePerKg: 100, total: 100 }],
      razorpay: { orderId: "order_rp_leak_14" },
      save: async function() {
        throw new Error("MongoServerError: Authentication failed with mongodb://admin:SuperSecretPassword123@db.prod.internal:27017/farmfresh at /var/www/internal/db.js:42:15");
      }
    });

    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: "ORD-LEAK-TEST-14", razorpay_order_id: "order_rp_leak_14", razorpay_payment_id: "pay_leak_14", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Internal server error");
    const jsonStr = JSON.stringify(res.body);
    assert(!jsonStr.includes("SuperSecretPassword123"), "Internal error must not leak passwords");
    assert(!jsonStr.includes("mongodb://"), "Internal error must not leak connection URIs");
    assert(!jsonStr.includes("/var/www/internal"), "Internal error must not leak internal paths");
  });

  // 15. Multi-item stock exhaustion restores lot status, quantity, hub inventory, and removes sales record
  await t.test("Regression 15: Multi-item stock exhaustion restores lot status, quantity, hub inventory, and removes sales record", async () => {
    const lotAId = "507f1f77bcf86cd7994391aa";
    const lotBId = "507f1f77bcf86cd7994391bb";
    const hubId = "507f1f77bcf86cd7994391cc";

    // Lot A starts fully LISTED with 10kg
    db.lots.set(lotAId, {
      _id: lotAId,
      crop: "Tomatoes",
      originalQtyKg: 10,
      remainingQtyKg: 10,
      qtyKg: 10,
      status: "LISTED",
      sales: [],
      events: [],
      hubId: hubId,
      save: async function() { db.lots.set(lotAId, this); return this; }
    });

    // Lot B has only 2kg remaining (insufficient for 5kg request)
    db.lots.set(lotBId, {
      _id: lotBId,
      crop: "Onions",
      originalQtyKg: 10,
      remainingQtyKg: 2,
      qtyKg: 2,
      status: "PARTIALLY_SOLD",
      sales: [],
      events: [],
      hubId: hubId,
      save: async function() { db.lots.set(lotBId, this); return this; }
    });

    db.hubs.set(hubId, {
      _id: hubId,
      name: "Test Hub Multi-Item",
      storedKg: 12,
      capacityKg: 1000
    });

    const orderId = "507f1f77bcf86cd7994391dd";
    const appOrderId = "ORD-MULTI-FAIL-15";
    db.orders.set(orderId, {
      _id: orderId,
      orderId: appOrderId,
      customerId: validHexId3,
      totalAmount: 600,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [
        { lotId: lotAId, crop: "Tomatoes", qtyKg: 10, pricePerKg: 40, total: 400 }, // Takes all 10kg -> Lot A hits 0 and status SOLD
        { lotId: lotBId, crop: "Onions", qtyKg: 5, pricePerKg: 40, total: 200 }      // Requests 5kg, but Lot B only has 2kg -> FAILS!
      ],
      razorpay: { orderId: "order_rp_multi_15" },
      save: async function() { db.orders.set(orderId, this); return this; }
    });

    const validSig = crypto.createHmac("sha256", testSecret).update("order_rp_multi_15|pay_multi_15").digest("hex");
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_multi_15",
      order_id: "order_rp_multi_15",
      amount: 60000,
      currency: "INR",
      status: "captured"
    };

    const res = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: appOrderId, razorpay_order_id: "order_rp_multi_15", razorpay_payment_id: "pay_multi_15", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, res);

    assert.strictEqual(res.statusCode, 409, "Must return HTTP 409 STOCK_EXHAUSTED");
    assert.strictEqual(res.body.code, "STOCK_EXHAUSTED");

    // Assert Lot A quantity is completely restored
    const lotA = db.lots.get(lotAId);
    assert.strictEqual(lotA.remainingQtyKg, 10, "Lot A remainingQtyKg must be restored to 10kg");
    assert.strictEqual(lotA.qtyKg, 10, "Lot A qtyKg must be restored to 10kg");

    // Assert Lot A status is restored to LISTED (since remainingQtyKg == originalQtyKg)
    assert.strictEqual(lotA.status, "LISTED", "Lot A status must be restored to LISTED, not remain SOLD");

    // Assert sale record for this order was pulled from Lot A
    const saleMatch = (lotA.sales || []).find(s => s.orderId === appOrderId);
    assert.strictEqual(saleMatch, undefined, "Sale record for failed order must be removed");

    // Assert hub inventory is restored
    const hub = db.hubs.get(hubId);
    assert.strictEqual(hub.storedKg, 12, "Hub storedKg must be restored to initial 12kg");

    // Assert order status
    const order = db.orders.get(orderId);
    assert.strictEqual(order.status, "CANCELLED");
    assert(order.paymentStatus === "REFUNDED" || order.paymentStatus === "REFUND_PENDING", "Order paymentStatus must reflect refund");
    assert.strictEqual(order.refund?.status, "PROCESSED", "Refund must be processed");

    razorpayConfig.razorpay.payments._mockPayment = null;
  });

  // 16. Gateway verification happens before database transaction starts
  await t.test("Regression 16: Gateway verification happens before database transaction starts", async () => {
    let transactionStarted = false;
    let gatewayCheckedBeforeTransaction = false;

    const origFetch = razorpayConfig.razorpay.payments.fetch;
    razorpayConfig.razorpay.payments.fetch = async (paymentId) => {
      // When fetch is executed, database transaction MUST NOT have been started
      if (!transactionStarted) {
        gatewayCheckedBeforeTransaction = true;
      }
      return {
        id: paymentId,
        order_id: "order_rp_seq_16",
        amount: 20000,
        currency: "INR",
        status: "captured"
      };
    };

    const origStartSession = mongoose.startSession;
    mongoose.startSession = async () => {
      transactionStarted = true;
      return {
        withTransaction: async (fn) => fn(),
        endSession: async () => { transactionStarted = false; }
      };
    };

    const orderId = "507f1f77bcf86cd7994391ee";
    db.orders.set(orderId, {
      _id: orderId,
      orderId: "ORD-SEQ-16",
      customerId: validHexId3,
      totalAmount: 200,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 2, pricePerKg: 100, total: 200 }],
      razorpay: { orderId: "order_rp_seq_16" },
      save: async function() { db.orders.set(orderId, this); return this; }
    });

    const validSig = crypto.createHmac("sha256", testSecret).update("order_rp_seq_16|pay_seq_16").digest("hex");

    try {
      const res = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: { orderId: "ORD-SEQ-16", razorpay_order_id: "order_rp_seq_16", razorpay_payment_id: "pay_seq_16", razorpay_signature: validSig },
        user: { _id: validHexId3, role: "consumer" }
      }, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(gatewayCheckedBeforeTransaction, true, "Gateway fetch must execute before transaction starts");

      // Now verify that if gateway fetch fails, transaction is NEVER opened at all
      transactionStarted = false;
      let transactionAttemptedOnFailure = false;
      razorpayConfig.razorpay.payments.fetch = async () => {
        throw new Error("Gateway connection timeout (ETIMEDOUT)");
      };
      mongoose.startSession = async () => {
        transactionAttemptedOnFailure = true;
        return { withTransaction: async (fn) => fn(), endSession: async () => {} };
      };

      const resFail = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: { orderId: "ORD-SEQ-16", razorpay_order_id: "order_rp_seq_16", razorpay_payment_id: "pay_seq_16", razorpay_signature: validSig },
        user: { _id: validHexId3, role: "consumer" }
      }, resFail);

      assert.strictEqual(resFail.statusCode, 502);
      assert.strictEqual(transactionAttemptedOnFailure, false, "Transaction must NEVER open if gateway check fails");
    } finally {
      razorpayConfig.razorpay.payments.fetch = origFetch;
      mongoose.startSession = origStartSession;
    }
  });

  // 17. Rejection when mandatory gateway response fields are missing
  await t.test("Regression 17: Rejection when mandatory gateway response fields are missing", async () => {
    const orderId = "507f1f77bcf86cd7994392aa";
    const appOrderId = "ORD-MISSING-FIELDS-17";
    db.orders.set(orderId, {
      _id: orderId,
      orderId: appOrderId,
      customerId: validHexId3,
      totalAmount: 150,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId: validHexId1, qtyKg: 1, pricePerKg: 150, total: 150 }],
      razorpay: { orderId: "order_rp_sec_17" },
      save: async function() { db.orders.set(orderId, this); return this; }
    });

    const validSig = crypto.createHmac("sha256", testSecret).update("order_rp_sec_17|pay_sec_17").digest("hex");

    // Case 17a: Missing remote payment id
    razorpayConfig.razorpay.payments._mockPayment = {
      // id omitted
      order_id: "order_rp_sec_17",
      amount: 15000,
      currency: "INR",
      status: "captured"
    };
    const resA = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: appOrderId, razorpay_order_id: "order_rp_sec_17", razorpay_payment_id: "pay_sec_17", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, resA);
    assert.strictEqual(resA.statusCode, 400);
    assert.strictEqual(resA.body.message, "Payment id mismatch");

    // Case 17b: Missing remote order_id
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_sec_17",
      // order_id omitted
      amount: 15000,
      currency: "INR",
      status: "captured"
    };
    const resB = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: appOrderId, razorpay_order_id: "order_rp_sec_17", razorpay_payment_id: "pay_sec_17", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, resB);
    assert.strictEqual(resB.statusCode, 400);
    assert.strictEqual(resB.body.message, "Order id mismatch");

    // Case 17c: Missing remote amount
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_sec_17",
      order_id: "order_rp_sec_17",
      // amount omitted
      currency: "INR",
      status: "captured"
    };
    const resC = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: appOrderId, razorpay_order_id: "order_rp_sec_17", razorpay_payment_id: "pay_sec_17", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, resC);
    assert.strictEqual(resC.statusCode, 400);
    assert.strictEqual(resC.body.message, "Payment amount mismatch");

    // Case 17d: Missing remote currency
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_sec_17",
      order_id: "order_rp_sec_17",
      amount: 15000,
      // currency omitted
      status: "captured"
    };
    const resD = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: appOrderId, razorpay_order_id: "order_rp_sec_17", razorpay_payment_id: "pay_sec_17", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, resD);
    assert.strictEqual(resD.statusCode, 400);
    assert.strictEqual(resD.body.message, "Payment currency mismatch");

    // Case 17e: Missing remote status
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_sec_17",
      order_id: "order_rp_sec_17",
      amount: 15000,
      currency: "INR"
      // status omitted
    };
    const resE = mockRes();
    await paymentController.verifyRazorpayPayment({
      body: { orderId: appOrderId, razorpay_order_id: "order_rp_sec_17", razorpay_payment_id: "pay_sec_17", razorpay_signature: validSig },
      user: { _id: validHexId3, role: "consumer" }
    }, resE);
    assert.strictEqual(resE.statusCode, 400);
    assert.strictEqual(resE.body.message, "Payment is not captured");

    // Confirm order remained PENDING throughout all missing-field tests
    assert.strictEqual(db.orders.get(orderId).paymentStatus, "PENDING");
    razorpayConfig.razorpay.payments._mockPayment = null;
  });

  // 18. Re-validation inside transaction rejects when order amount changed after initial validation
  await t.test("Regression 18: Re-validation inside transaction rejects when order amount changed after initial validation", async () => {
    const orderId = "507f1f77bcf86cd7994392bb";
    const appOrderId = "ORD-RACE-AMOUNT-18";
    const lotId = "507f1f77bcf86cd7994392cc";

    db.lots.set(lotId, {
      _id: lotId,
      crop: "Potatoes",
      originalQtyKg: 50,
      remainingQtyKg: 50,
      qtyKg: 50,
      status: "LISTED",
      sales: [],
      events: [],
      hubId: validHexHub,
      save: async function() { db.lots.set(lotId, this); return this; }
    });

    const ord = {
      _id: orderId,
      orderId: appOrderId,
      customerId: validHexId3,
      totalAmount: 200,
      paymentStatus: "PENDING",
      status: "PLACED",
      items: [{ lotId, qtyKg: 5, pricePerKg: 40, total: 200 }],
      razorpay: { orderId: "order_rp_race_18" },
      save: async function() { db.orders.set(orderId, this); return this; }
    };
    db.orders.set(orderId, ord);

    const validSig = crypto.createHmac("sha256", testSecret).update("order_rp_race_18|pay_race_18").digest("hex");
    razorpayConfig.razorpay.payments._mockPayment = {
      id: "pay_race_18",
      order_id: "order_rp_race_18",
      amount: 20000,
      currency: "INR",
      status: "captured"
    };

    // Simulate order total amount mutating concurrently in the database before transaction lock
    const origOrderFindOne = Order.findOne;
    Order.findOne = (query) => {
      const found = origOrderFindOne(query);
      return {
        session: () => {
          // Inside transaction query: return mutated order with modified totalAmount
          const mutated = { ...ord, totalAmount: 350 };
          return Promise.resolve(mutated);
        },
        then: (resolve) => resolve(found)
      };
    };

    try {
      const res = mockRes();
      await paymentController.verifyRazorpayPayment({
        body: { orderId: appOrderId, razorpay_order_id: "order_rp_race_18", razorpay_payment_id: "pay_race_18", razorpay_signature: validSig },
        user: { _id: validHexId3, role: "consumer" }
      }, res);

      // Must be rejected inside transaction due to amount mismatch
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, "Payment amount mismatch");

      // Verify order was not marked paid and inventory was not decremented
      assert.strictEqual(db.orders.get(orderId).paymentStatus, "PENDING");
      assert.strictEqual(db.lots.get(lotId).remainingQtyKg, 50, "Inventory must remain completely untouched");
    } finally {
      Order.findOne = origOrderFindOne;
      razorpayConfig.razorpay.payments._mockPayment = null;
    }
  });
});

// ---------------------------------------------------------------------------
// 6. REGRESSION CHECK: MONGOOSE CONNECTION ISOLATION
// ---------------------------------------------------------------------------
test("Regression Check: Mongoose Connection Isolation", async (t) => {
  await t.test("unit tests never attempt or establish a real Mongoose connection", async () => {
    assert.strictEqual(mongoose.connection.readyState, 0, "Mongoose must remain disconnected (readyState 0) in unit tests");
    await assert.rejects(
      async () => { await mongoose.connect("mongodb://localhost:27017/fake-test-db"); },
      /REGRESSION ERROR: controllers.test.js must never call mongoose.connect\(\)/
    );
  });
});
