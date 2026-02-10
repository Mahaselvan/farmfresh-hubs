import { useState } from "react";
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

export default function Checkout() {
  const toast = useToast();
  const navigate = useNavigate();

  const { cartItems, totalAmount, clearCart } = useCart();

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: ""
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async () => {
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

      const res = await api.placeOrder(payload);
      const orderId = res.data.data.orderId || res.data.data._id;
      navigate(`/order/${res.data.data._id}`);
      navigate(`/orders/${orderId}`);
     navigate(`/checkout/success/${res.data.data.orderId}`);
     
      toast({
        title: "Order placed ✅",
        description: `Order ID: ${res.data.data.orderId}`,
        status: "success",
        duration: 4000,
        isClosable: true
      });

      clearCart();

    } catch (err) {
      toast({
        title: "Checkout failed",
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 4000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="4xl" py={10}>
      <Heading color="green.700">Checkout</Heading>
      <Text mt={2} color="gray.600">
        Payment simulated (no UPI). Order will be stored in MongoDB.
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
          Place Order (Simulated Payment)
        </Button>
      </Box>
    </Container>
  );
}
