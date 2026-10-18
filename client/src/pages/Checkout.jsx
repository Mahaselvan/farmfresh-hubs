import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Radio,
  RadioGroup,
  Stack,
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

  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();

  const [form, setForm] = useState({ customerName: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

  const subtotal = useMemo(
    () => Math.round(cartItems.reduce((sum, item) => sum + Number(item.qtyKg) * Number(item.lot.expectedPrice || 0), 0)),
    [cartItems]
  );
  const delivery = 0;
  const total = subtotal + delivery;

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({ ...prev, customerName: prev.customerName || user.name || "", phone: prev.phone || user.phone || "" }));
  }, [user]);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const verifyPayment = async ({ paymentData, appOrderId }) => {
    const verifyRes = await api.verifyPayment({ orderId: appOrderId, ...paymentData });
    if (!verifyRes.data?.success) throw new Error("Payment verification failed");
  };

  const handlePlaceOrder = async () => {
    if (loading) return;
    if (cartItems.length === 0) {
      toast({ title: "Your cart is empty.", status: "warning" });
      return;
    }

    if (!form.customerName.trim() || !form.phone.trim() || !form.address.trim()) {
      toast({ title: "Please fill delivery details.", status: "warning" });
      return;
    }

    if (paymentMethod !== "RAZORPAY") {
      toast({ title: "Only Razorpay is supported in this demo.", status: "info" });
      return;
    }

    let checkoutOpened = false;
    try {
      setLoading(true);
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) throw new Error("Razorpay SDK failed to load");
      if (!razorpayKeyId) throw new Error("Missing VITE_RAZORPAY_KEY_ID in client env");

      const payload = {
        customerName: form.customerName,
        phone: form.phone,
        address: form.address,
        items: cartItems.map((x) => ({ lotId: x.lot._id, qtyKg: Number(x.qtyKg) }))
      };

      const orderRes = await api.placeOrder(payload);
      const appOrder = orderRes.data?.data;
      const appOrderId = appOrder?._id || appOrder?.orderId;
      if (!appOrderId) throw new Error("Order created but no id returned");

      const rpOrderRes = await api.createPaymentOrder({ orderId: appOrderId });
      const rpOrder = rpOrderRes.data?.data;
      if (!rpOrder?.id) throw new Error("Failed to initialize payment order");

      const paymentObject = new window.Razorpay({
        key: razorpayKeyId,
        amount: rpOrder.amount,
        currency: rpOrder.currency || "INR",
        name: "FarmFresh Hubs",
        description: `Payment for ${appOrder.orderId}`,
        order_id: rpOrder.id,
        prefill: { name: form.customerName, contact: form.phone },
        handler: async (response) => {
          try {
            await verifyPayment({ appOrderId, paymentData: response });
            toast({ title: "Payment successful.", status: "success" });
            clearCart();
            navigate(`/checkout/success/${appOrder.orderId}`);
          } catch (err) {
            toast({ title: "Payment verification failed", description: err?.response?.data?.message || err.message, status: "error" });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast({ title: "Payment cancelled", status: "warning" });
          }
        },
        theme: { color: "#2E7D32" }
      });

      paymentObject.open();
      checkoutOpened = true;
    } catch (err) {
      toast({ title: "Checkout failed", description: err?.response?.data?.message || err.message, status: "error" });
    } finally {
      if (!checkoutOpened) setLoading(false);
    }
  };

  return (
    <Container maxW="5xl" py={8}>
      <Heading color="green.700">Checkout</Heading>

      <Card mt={6}><CardBody>
        <Heading size="md">Delivery Details</Heading>
        <FormControl mt={4} isRequired><FormLabel>Name</FormLabel><Input name="customerName" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} /></FormControl>
        <FormControl mt={4} isRequired><FormLabel>Phone</FormLabel><Input name="phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></FormControl>
        <FormControl mt={4} isRequired><FormLabel>Address</FormLabel><Textarea name="address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></FormControl>
      </CardBody></Card>

      <Card mt={4}><CardBody>
        <Heading size="md">Your Order</Heading>
        <Stack mt={3} spacing={2}>
          {cartItems.map((item) => (
            <Box key={item.lot._id}>
              <Text>{item.lot.crop}</Text>
              <Text fontSize="sm" color="gray.600">{item.qtyKg} kg × ₹{item.lot.expectedPrice} = ₹{Number(item.qtyKg) * Number(item.lot.expectedPrice)}</Text>
            </Box>
          ))}
        </Stack>

        <Stack mt={4} spacing={1}>
          <Text>Subtotal: ₹{subtotal}</Text>
          <Text>Delivery: ₹{delivery}</Text>
          <Text fontWeight="700">Total: ₹{total}</Text>
        </Stack>

        <Box mt={4}>
          <Text fontWeight="700" mb={2}>Payment</Text>
          <RadioGroup value={paymentMethod} onChange={setPaymentMethod}>
            <Stack>
              <Radio value="RAZORPAY">Razorpay</Radio>
            </Stack>
          </RadioGroup>
        </Box>

        <Button mt={6} colorScheme="green" width="100%" h="44px" isLoading={loading} loadingText="Processing payment..." onClick={handlePlaceOrder}>Place Order</Button>
      </CardBody></Card>
    </Container>
  );
}
