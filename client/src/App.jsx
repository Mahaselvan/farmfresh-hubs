import { Routes, Route, Link as RouterLink } from "react-router-dom";
import { Box, Container, HStack, Link, Spacer, Text } from "@chakra-ui/react";
import Home from "./pages/Home";
import Booking from "./pages/Booking";
import Dashboard from "./pages/Dashboard";
import Market from "./pages/Market";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Ledger from "./pages/Ledger";
import Alerts from "./pages/Alerts";
import Notifications from "./pages/Notifications";
import Navbar from "./components/Navbar";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import OrderDetails from "./pages/OrderDetails";
import Orders from "./pages/Orders";
import LotQR from "./pages/LotQR";
import Trace from "./pages/Trace";
import Traceability from "./pages/Traceability";
import FarmerDashboard from "./pages/FarmerDashboard";
import QrSlip from "./pages/QrSlip";
import OrderTracking from "./pages/OrderTracking";

function Placeholder({ title }) {
  return (
    <Container maxW="6xl" py={10}>
      <Text fontSize="2xl" fontWeight="bold">{title}</Text>
      <Text mt={2} color="gray.600">Next step: we’ll build this page fully.</Text>
    </Container>
  );
}

export default function App() {
  return (
    <Box minH="100vh">
       <Navbar />
     <Routes>
  <Route path="/" element={<Home />} />

  {/* Farmer */}
  <Route path="/booking" element={<Booking />} />
  <Route path="/farmer" element={<FarmerDashboard />} />

  {/* Hub */}
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/ledger/:lotId" element={<Ledger />} />

  {/* Consumer */}
  <Route path="/market" element={<Market />} />
  <Route path="/market/:lotId" element={<ProductDetails />} />
  <Route path="/cart" element={<Cart />} />
  <Route path="/checkout" element={<Checkout />} />

  {/* Orders */}
  <Route path="/checkout/success/:orderId" element={<CheckoutSuccess />} />
  <Route path="/orders" element={<Orders />} />
  <Route path="/orders/:orderId" element={<OrderTracking />} />

  {/* Public trust pages */}
  <Route path="/qr/:lotId" element={<QrSlip />} />
  <Route path="/trace/:lotId" element={<Traceability />} />

  {/* Alerts */}
  <Route path="/alerts" element={<Alerts />} />
  <Route path="/notifications" element={<Notifications />} />
</Routes>

    </Box>
  );
}
