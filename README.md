# 🌿 FarmFresh Hubs (MERN MVP)

FarmFresh Hubs is a full-stack MERN project that solves post-harvest wastage and market access problems by combining **Cold Storage Hub Booking**, **Hub Operator Dashboard**, and a **Farmer-to-Consumer Marketplace**.

###This MVP demonstrates:
- Farmer Booking & Lot Creation
- QR Slip Generation
- Hub Inventory Dashboard
- Consumer Marketplace (Cart + Checkout)
- Order Tracking
- Payment Ledger & Notifications
- Multilingual Farmer Pages (Tamil, Telugu, Hindi, Malayalam)
- 💳 Secure Razorpay Payment Integration (Test Mode)

---

## 🚀 Live Demo
🔗 **Deployed on Render:**  
(https://farmfresh-hubs.onrender.com/)
---

## 📸 Screenshots
### Dashboard
<img width="1919" height="1071" alt="Screenshot 2026-02-10 183957" src="https://github.com/user-attachments/assets/77a4176a-fbb9-4cab-935d-f8468f01880a" />


### Booking Page
<img width="1919" height="1069" alt="Screenshot 2026-02-10 184022" src="https://github.com/user-attachments/assets/908f326b-0cc3-4319-973b-341c78e988e0" />


### Marketplace
<img width="1919" height="1067" alt="Screenshot 2026-02-10 184056" src="https://github.com/user-attachments/assets/6b6804b9-d9d4-4f56-a21d-643e919a31ac" />


### QR Slip
<img width="1919" height="1065" alt="image" src="https://github.com/user-attachments/assets/9048fbbb-dc86-44cf-9d41-902f9c95f03a" />


### Checkout
<img width="1918" height="1065" alt="Screenshot 2026-02-10 184117" src="https://github.com/user-attachments/assets/d3966300-93a9-4c7b-a61f-bf54bdff8277" />


### Order Tracking
<img width="1918" height="1069" alt="Screenshot 2026-02-10 184152" src="https://github.com/user-attachments/assets/cc9816ec-271a-48f0-8349-f467e8763986" />

---

###🧩 Features
👨‍🌾 Farmer Side

Crop Booking Form

Lot ID generation

QR Slip generation

Multilingual support (Tamil / Telugu / Hindi / Malayalam)

###🏢 Hub Operator Side

Lot status update workflow

Storage monitoring (Temp / Humidity)

Alerts system

Ledger view for deductions and settlement tracking

###🛒 Consumer Side

Marketplace listing of LISTED lots

Product details + traceability

Cart & Checkout

Order placement and tracking timeline

###💳 Payments (Razorpay Integration)

FarmFresh Hubs integrates Razorpay (Test Mode) for secure online payments.

###🔄 Payment Flow

User clicks Pay Now

Backend creates Razorpay order

Razorpay Checkout popup opens

User completes payment (Test Mode)

Backend verifies payment signature using HMAC SHA256

Order marked as PAID

Ledger & notifications updated

###🔐 Security Implementation

Order creation handled on backend

Payment signature verified using:

razorpay_order_id

razorpay_payment_id

razorpay_signature

Frontend success response is not trusted without backend validation

Secure environment variable handling for API keys

###🧪 Test Mode Details

This project uses Razorpay Test Mode for development.

Test Card:
```
Card Number: 4111 1111 1111 1111
Expiry: Any future date
CVV: Any 3 digits
OTP: 123456
```

No real money is processed.

###🔔 Notifications
-System notifications for lot updates
-Order update alerts
-Payment confirmation logs



## 🛠️ Tech Stack

### Frontend
- React (Vite)
- Chakra UI
- React Router DOM
- Axios
- i18next (Multilingual support)

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- Morgan Logger
- Razorpay SDK
- CORS

---

## 📂 Project Structure
farmfresh-hubs/ 
Frontend 
client/     # React 
Backend 
server/     # Express 
---

###⚙️ Installation & Running Locally
1️⃣ Clone Repository
```
git clone https://github.com/Mahaselvan/farmfresh-hubs.git
cd farmfresh-hubs
```
2️⃣ Environment Variables

Create server/.env
```
MONGO_URI=your_mongodb_connection_string
PORT=5000
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
```
Create client/.env
```
VITE_API_BASE_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```
3️⃣ Install Dependencies

cd server
```
npm install
```
cd ../client
```
npm install
```
4️⃣ Run Locally

Backend:
```
cd server
npm run dev
```

Frontend:
```
cd client
npm run dev
```
###🧪 Running Automated Tests
Run the comprehensive test suite (unit, integration, concurrency, and security tests):
```bash
cd server
npm test
```

###🏗️ Production Build & Render Deployment
To build and run as a single unified service (serving APIs and built React SPA):
```bash
# 1. Install all dependencies
npm run install-all

# 2. Build frontend Single Page Application
npm run build

# 3. Start unified Node/Express server (serves API on /api and SPA on /)
npm start
```

###🔒 Security Hardening & Implementation
- **Payment Signature Verification**: HMAC-SHA256 signature verification comparing stored order amount and currency using timing-safe comparisons.
- **Decoupled Transactions**: Gateway refund calls are isolated from MongoDB multi-document transactions to avoid write locks and transaction timeouts.
- **Durable Refund Lease / Mutex**: Atomic conditional locking prevents duplicate refunds during concurrent verification requests or network retries.
- **In-Flight Recovery Worker**: Automatic startup and administrative reconciliation (`POST /api/payments/reconcile-refunds`) queries Razorpay for uncertain or interrupted refund requests.
- **Rate Limiting & Proxy Trust**: Configurable `TRUST_PROXY` hop count and IPv6-normalized rate limiting protect against brute force and DDoS.
- **ID Compatibility**: Format-preserving native Node.js cryptographic ID generator ensures high entropy with zero CommonJS/ESM runtime conflicts.

###🤝 Contributing

- Fork the repository
- Create a feature branch
- Commit changes with clear messages
- Open a pull request
