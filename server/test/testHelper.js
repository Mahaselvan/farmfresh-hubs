const Module = require("module");

const origLoad = Module._load;

try {
  const realMongoose = require("mongoose");
  if (realMongoose && typeof realMongoose.set === "function") {
    realMongoose.set("bufferCommands", false);
    realMongoose.set("bufferTimeoutMS", 0);
  }
} catch (e) {
  // Ignore if mongoose not installed
}

const mockMongoose = {
  Types: {
    ObjectId: {
      isValid: (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
    }
  },
  isValidObjectId: (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id),
  Schema: function() {
    return {
      index: () => {},
      virtual: () => ({ get: () => {} }),
      set: () => {}
    };
  },
  model: function(name) {
    class MockModel {
      constructor(data) { Object.assign(this, data); }
      save() { return Promise.resolve(this); }
      static find() { return new MockQuery(); }
      static findById() { return new MockQuery(); }
      static findOne() { return new MockQuery(); }
      static create(obj) { return Promise.resolve({ _id: "507f1f77bcf86cd799439011", ...obj }); }
      static insertMany(arr) { return Promise.resolve(arr); }
      static updateMany() { return Promise.resolve({ modifiedCount: 1 }); }
      static updateOne() { return Promise.resolve({ modifiedCount: 1 }); }
      static countDocuments() { return Promise.resolve(0); }
      static findOneAndUpdate() { return Promise.resolve(null); }
    }
    return MockModel;
  },
  startSession: async () => ({
    withTransaction: async (cb) => cb(),
    endSession: async () => {}
  }),
  set: () => {},
  connect: async () => ({ connection: { host: "mock-host", name: "farmfresh-mock" } })
};
mockMongoose.Schema.Types = { ObjectId: String };

class MockQuery {
  constructor(data = []) { this._data = data; }
  sort() { return this; }
  limit() { return this; }
  skip() { return this; }
  populate() { return this; }
  session() { return this; }
  then(resolve, reject) { return Promise.resolve(this._data).then(resolve, reject); }
}

const mockRateLimit = () => (req, res, next) => next();

const mockNanoid = {
  nanoid: () => "mock_id_" + Math.random().toString(36).substring(2, 9)
};

class MockRazorpay {
  constructor() {
    this._refunds = [];
    this._mockRefundStatus = "processed";
    this.orders = {
      create: async (opts) => ({
        id: "order_rp_mock_" + Math.random().toString(36).substring(2, 9),
        amount: opts.amount,
        currency: opts.currency,
        receipt: opts.receipt
      })
    };
    this.payments = {
      fetch: async (paymentId) => {
        if (this._mockPayment) return this._mockPayment;
        if (this.payments && this.payments._mockPayment) return this.payments._mockPayment;
        return null;
      },
      fetchMultipleRefund: async (paymentId) => {
        if (this._mockRefunds) return { entity: "collection", count: this._mockRefunds.length, items: this._mockRefunds };
        const matching = this._refunds.filter((r) => r.payment_id === paymentId);
        return { entity: "collection", count: matching.length, items: matching };
      },
      refund: async (paymentId, opts) => {
        if (this._mockRefundError) throw this._mockRefundError;
        const rfnd = {
          id: "rfnd_mock_" + Math.random().toString(36).substring(2, 9),
          payment_id: paymentId,
          amount: opts?.amount,
          status: this._mockRefundStatus || "processed",
          notes: opts?.notes || {}
        };
        this._refunds.push(rfnd);
        return rfnd;
      }
    };
  }
}

const createMockExpressApp = () => {
  const routes = [];
  const settings = {};
  const app = function(req, res) {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(obj));
      return res;
    };
    const url = (req.url || "/").split("?")[0];
    const method = req.method;

    let idx = 0;
    function next(err) {
      if (err) {
        for (let i = 0; i < routes.length; i++) {
          const r = routes[i];
          if (r.method === "USE" && r.handler && r.handler.length === 4) {
            return r.handler(err, req, res, () => {});
          }
          if (r.handlers) {
            const h = r.handlers.find(fn => fn.length === 4);
            if (h) return h(err, req, res, () => {});
          }
        }
        res.status(500).json({ success: false, message: err.message });
        return;
      }
      if (idx >= routes.length) {
        res.status(404).json({ success: false, message: "Not Found" });
        return;
      }
      const r = routes[idx++];
      if (r.method === "USE") {
        if (r.handler && r.handler.length === 4) {
          return next();
        }
        if (url.startsWith(r.prefix)) {
          if (r.handler._routes) {
            const origUrl = req.url;
            req.url = req.url.slice(r.prefix.length) || "/";
            if (!req.url.startsWith("/")) req.url = "/" + req.url;
            return r.handler(req, res, (err) => {
              req.url = origUrl;
              next(err);
            });
          }
          return r.handler(req, res, next);
        }
        return next();
      }
      if (r.method === method && (r.path === url || r.path === "*")) {
        let hIdx = 0;
        function runHandler() {
          if (hIdx >= r.handlers.length) return next();
          const h = r.handlers[hIdx++];
          h(req, res, runHandler);
        }
        return runHandler();
      }
      return next();
    }
    next();
  };

  app.set = (k, v) => { settings[k] = v; return app; };
  app.get = (path, ...handlers) => {
    if (typeof path === "string" && handlers.length === 0) return settings[path];
    routes.push({ method: "GET", path, handlers });
    return app;
  };
  app.post = (path, ...handlers) => { routes.push({ method: "POST", path, handlers }); return app; };
  app.patch = (path, ...handlers) => { routes.push({ method: "PATCH", path, handlers }); return app; };
  app.delete = (path, ...handlers) => { routes.push({ method: "DELETE", path, handlers }); return app; };
  app.use = (...args) => {
    if (typeof args[0] === "string") {
      routes.push({ method: "USE", prefix: args[0], handler: args[1] });
    } else {
      routes.push({ method: "USE", prefix: "/", handler: args[0] });
    }
    return app;
  };
  app.listen = (port, cb) => { if (cb) cb(); return { close: (c) => { if (c) c(); } }; };
  app._routes = routes;
  app._settings = settings;
  return app;
};

const mockExpress = () => createMockExpressApp();
mockExpress.json = () => (req, res, next) => next();
mockExpress.urlencoded = () => (req, res, next) => next();
mockExpress.static = () => (req, res, next) => next();
mockExpress.Router = () => createMockExpressApp();

// Hook Module._load so unit tests can run reliably without npm install
Module._load = function(request, parent, isMain) {
  try {
    return origLoad.apply(this, arguments);
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      if (request === "dotenv") return { config: () => ({ parsed: {} }) };
      if (request === "express") return mockExpress;
      if (request === "mongoose") return mockMongoose;
      if (request === "express-rate-limit") return mockRateLimit;
      if (request === "nanoid") return mockNanoid;
      if (request === "razorpay") return MockRazorpay;
      if (request === "cors") return () => (req, res, next) => next();
      if (request === "morgan") return () => (req, res, next) => next();
      if (request === "bcryptjs") {
        return {
          hash: async (str) => "hashed_" + str,
          compare: async (plain, hash) => hash === "hashed_" + plain
        };
      }
      if (request === "jsonwebtoken") {
        return {
          sign: () => "mock.jwt.token",
          verify: (token, secret) => ({ id: "507f1f77bcf86cd799439011", role: "consumer" })
        };
      }
    }
    throw err;
  }
};

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    }
  };
  return res;
}

module.exports = {
  mockMongoose,
  mockRateLimit,
  mockNanoid,
  MockRazorpay,
  MockQuery,
  mockRes
};
