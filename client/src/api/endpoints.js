import { http } from "./http";

export const api = {
  // hubs
  getHubs: () => http.get("/api/hubs"),

  // lots (hub operator + booking)
  getLots: (params = {}) => http.get("/api/lots", { params }),
  createLot: (payload) => http.post("/api/lots", payload),
  updateLot: (id, payload) => http.patch(`/api/lots/${id}`, payload),
  getLotById: (id) => http.get(`/api/lots/${id}`),
  getLotByLotId: (lotId) => http.get(`/api/lots/by-lotid/${lotId}`),

  // farmer lots (demo filter)
  getFarmerLots: (phone) => http.get("/api/lots/farmer/search", { params: { phone } }),

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

  // alerts + notifications
  getAlerts: () => http.get("/api/alerts"),
  getNotifications: (params = {}) => http.get("/api/notifications", { params }),

  // payments
  getLotLedger: (lotObjectId) => http.get(`/api/payments/ledger/${lotObjectId}`)
};
