import { http } from "./http";

export const api = {
  // hubs
  getHubs: () => http.get("/api/hubs"),

  // lots
  getLots: (params = {}) => http.get("/api/lots", { params }),
  getMyLots: (params = {}) => http.get("/api/lots/my", { params }),
  createLot: (payload) => http.post("/api/lots", payload),
  updateLot: (id, payload) => http.patch(`/api/lots/${id}`, payload),
  getLotById: (id) => http.get(`/api/lots/${id}`),
  getLotByLotId: (lotId) => http.get(`/api/lots/by-lotid/${lotId}`),

  // marketplace
  getListedLots: (params = {}) => http.get("/api/market/lots", { params }),
  getMarketLot: (lotId) => http.get(`/api/market/lots/${lotId}`),

  // traceability
  getTrace: (lotId) => http.get(`/api/market/trace/${lotId}`),

  // orders
  placeOrder: (payload) => http.post("/api/orders", payload),
  getOrderById: (orderId) => http.get(`/api/orders/${orderId}`),
  getAllOrders: (params = {}) => http.get("/api/orders", { params }),
  updateOrderStatus: (id, payload) => http.patch(`/api/orders/${id}/status`, payload),

  // notifications
  getNotifications: (params = {}) => http.get("/api/notifications", { params }),
  markNotificationRead: (id) => http.patch(`/api/notifications/${id}/read`),
  markAllNotificationsRead: () => http.patch("/api/notifications/read-all"),

  // alerts
  getAlerts: () => http.get("/api/alerts"),

  // payments
  getLotLedger: (lotObjectId) => http.get(`/api/payments/ledger/${lotObjectId}`),
  createPaymentOrder: (payload) => http.post("/api/payments/create-order", payload),
  verifyPayment: (payload) => http.post("/api/payments/verify-payment", payload),

  // auth
  register: (payload) => http.post("/api/auth/register", payload),
  login: (payload) => http.post("/api/auth/login", payload),
  me: () => http.get("/api/auth/me")
};
