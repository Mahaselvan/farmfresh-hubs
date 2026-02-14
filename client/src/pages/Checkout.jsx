import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  Textarea,
  useToast
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function Checkout() {
  const toast = useToast();
  const navigate = useNavigate();

  const { cartItems, totalAmount, clearCart } = useCart();
  const { user } = useAuth();

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: ""
  });

  const [loading, setLoading] = useState(false);
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || user.name || "",
      phone: prev.phone || user.phone || ""
    }));
  }, [user]);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const verifyPayment = async ({ paymentData, appOrderId }) => {
    const verifyRes = await api.verifyPayment({
      orderId: appOrderId,
      ...paymentData
    });

    if (!verifyRes.data?.success) {
      throw new Error("Payment verification failed");
    }
  };

  const handlePlaceOrder = async () => {
    let checkoutOpened = false;

    if (cartItems.length === 0) {
      toast({
        title: "Cart empty",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (!form.customerName.trim() || !form.phone.trim() || !form.address.trim()) {
      toast({
        title: "Fill all details",
        status: "warning",
        duration: 2500,
        isClosable: true
      });
      return;
    }

    try {
      setLoading(true);
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error("Razorpay SDK failed to load");
      }

      if (!razorpayKeyId) {
        throw new Error("Missing VITE_RAZORPAY_KEY_ID in client env");
      }

      const payload = {
        customerName: form.customerName,
        phone: form.phone,
        address: form.address,
        items: cartItems.map((x) => ({
          lotId: x.lot._id,
          qtyKg: x.qtyKg,
          price: x.lot.expectedPrice
        }))
      };

      const orderRes = await api.placeOrder(payload);
      const appOrder = orderRes.data?.data;
      const appOrderId = appOrder?._id || appOrder?.orderId;

      if (!appOrderId) {
        throw new Error("Order was created but no order id returned");
      }

      const rpOrderRes = await api.createPaymentOrder({ orderId: appOrderId });
      const rpOrder = rpOrderRes.data?.data;

      if (!rpOrder?.id) {
        throw new Error("Failed to initialize payment order");
      }

      const options = {
        key: razorpayKeyId,
        amount: rpOrder.amount,
        currency: rpOrder.currency || "INR",
        name: "FarmFresh Hubs",
        description: `Payment for ${appOrder.orderId}`,
        order_id: rpOrder.id,
        prefill: {
          name: form.customerName,
          contact: form.phone
        },
        handler: async (response) => {
          try {
            await verifyPayment({
              appOrderId,
              paymentData: response
            });

            toast({
              title: "Payment successful ✅",
              description: `Order ID: ${appOrder.orderId}`,
              status: "success",
              duration: 4000,
              isClosable: true
            });

            clearCart();
            navigate(`/checkout/success/${appOrder.orderId}`);
          } catch (err) {
            toast({
              title: "Payment verification failed",
              description: err?.response?.data?.message || err.message,
              status: "error",
              duration: 4000,
              isClosable: true
            });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast({
              title: "Payment cancelled",
              description: "You can retry payment from checkout.",
              status: "warning",
              duration: 3000,
              isClosable: true
            });
          }
        },
        theme: {
          color: "#2E7D32"
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      checkoutOpened = true;
      return;

    } catch (err) {
      const backendMessage = err?.response?.data?.message || err.message;
      const lotNotListed = String(backendMessage).includes("is not LISTED");

      toast({
        title: "Checkout failed",
        description: lotNotListed
          ? `${backendMessage}. Remove this item from cart and pick an available lot.`
          : backendMessage,
        status: "error",
        duration: 4000,
        isClosable: true
      });
    } finally {
      if (!checkoutOpened) {
        setLoading(false);
      }
    }
  };

  return (
    <Container maxW="4xl" py={10}>
      <Heading color="green.700">Checkout</Heading>
      <Text mt={2} color="gray.600">
        Secure Razorpay test payment. Order will be marked paid after signature verification.
      </Text>

      <Box mt={6} border="1px solid" borderColor="gray.200" p={5} borderRadius="md">
        <Text fontSize="lg" fontWeight="bold">
          Total Amount: ₹{totalAmount}
        </Text>

        <FormControl mt={4} isRequired>
          <FormLabel>Customer Name</FormLabel>
          <Input name="customerName" value={form.customerName} onChange={handleChange} />
        </FormControl>

        <FormControl mt={4} isRequired>
          <FormLabel>Phone</FormLabel>
          <Input name="phone" value={form.phone} onChange={handleChange} />
        </FormControl>

        <FormControl mt={4} isRequired>
          <FormLabel>Delivery Address</FormLabel>
          <Textarea name="address" value={form.address} onChange={handleChange} />
        </FormControl>

        <Button
          mt={6}
          colorScheme="green"
          width="100%"
          isLoading={loading}
          onClick={handlePlaceOrder}
        >
          Pay with Razorpay
        </Button>
      </Box>
    </Container>
  );
}
