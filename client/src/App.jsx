import { Routes, Route, Link as RouterLink } from "react-router-dom";
import { Box, Container, HStack, Link, Spacer, Text } from "@chakra-ui/react";
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
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRedirect from "./components/RoleRedirect";

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
  <Route path="/" element={<RoleRedirect />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />

  {/* Farmer */}
  <Route
    path="/booking"
    element={
      <ProtectedRoute roles={["farmer"]}>
        <Booking />
      </ProtectedRoute>
    }
  />
  <Route
    path="/farmer"
    element={
      <ProtectedRoute roles={["farmer"]}>
        <FarmerDashboard />
      </ProtectedRoute>
    }
  />

  {/* Hub */}
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute roles={["operator", "admin"]}>
        <Dashboard />
      </ProtectedRoute>
    }
  />
  <Route
    path="/ledger/:lotId"
    element={
      <ProtectedRoute roles={["operator", "admin"]}>
        <Ledger />
      </ProtectedRoute>
    }
  />

  {/* Consumer */}
  <Route
    path="/market"
    element={
      <ProtectedRoute roles={["consumer"]}>
        <Market />
      </ProtectedRoute>
    }
  />
  <Route
    path="/market/:lotId"
    element={
      <ProtectedRoute roles={["consumer"]}>
        <ProductDetails />
      </ProtectedRoute>
    }
  />
  <Route
    path="/cart"
    element={
      <ProtectedRoute roles={["consumer"]}>
        <Cart />
      </ProtectedRoute>
    }
  />
  <Route
    path="/checkout"
    element={
      <ProtectedRoute roles={["consumer"]}>
        <Checkout />
      </ProtectedRoute>
    }
  />

  {/* Orders */}
  <Route
    path="/checkout/success/:orderId"
    element={
      <ProtectedRoute roles={["consumer"]}>
        <CheckoutSuccess />
      </ProtectedRoute>
    }
  />
  <Route
    path="/orders"
    element={
      <ProtectedRoute roles={["consumer"]}>
        <Orders />
      </ProtectedRoute>
    }
  />
  <Route
    path="/orders/:orderId"
    element={
      <ProtectedRoute roles={["consumer"]}>
        <OrderTracking />
      </ProtectedRoute>
    }
  />

  {/* Public trust pages */}
  <Route path="/qr/:lotId" element={<QrSlip />} />
  <Route path="/trace/:lotId" element={<Traceability />} />

  {/* Alerts */}
  <Route
    path="/alerts"
    element={
      <ProtectedRoute roles={["operator", "admin"]}>
        <Alerts />
      </ProtectedRoute>
    }
  />
  <Route
    path="/notifications"
    element={
      <ProtectedRoute roles={["farmer", "consumer", "operator", "admin"]}>
        <Notifications />
      </ProtectedRoute>
    }
  />
</Routes>

    </Box>
  );
}
