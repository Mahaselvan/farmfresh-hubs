import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Card,
  CardBody,
  Container,
  Divider,
  Heading,
  Skeleton,
  Text,
  VStack
} from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { api } from "../api/endpoints";

const ORDER_STEPS = ["PLACED", "CONFIRMED", "PACKING", "DISPATCHED", "DELIVERED"];

const getStatusColor = (status) => {
  const map = {
    PLACED: "gray",
    CONFIRMED: "blue",
    PACKING: "orange",
    DISPATCHED: "purple",
    DELIVERED: "green",
    CANCELLED: "red"
  };
  return map[status] || "gray";
};

export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await api.getOrderById(orderId);
        setOrder(res.data.data);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const activeStep = ORDER_STEPS.indexOf(order?.status);

  return (
    <Container maxW="4xl" py={8}>
      <Heading color="green.700">Order Tracking</Heading>

      {loading ? <Skeleton mt={6} height="180px" /> : !order ? (
        <Text mt={6} color="red.500">Order not found.</Text>
      ) : (
        <Card mt={6}><CardBody>
          <Heading size="md">Order ID: {order.orderId}</Heading>
          <Text mt={3}><b>Status:</b> <Badge colorScheme={getStatusColor(order.status)}>{order.status}</Badge></Text>
          <Text mt={2}><b>Total Amount:</b> ₹{order.totalAmount}</Text>

          <VStack mt={4} align="stretch" spacing={2}>
            {ORDER_STEPS.map((step, idx) => (
              <Box key={step} p={2} borderRadius="md" bg={idx <= activeStep ? "green.50" : "gray.50"}>
                <Text fontWeight={idx === activeStep ? "700" : "500"}>{step}</Text>
              </Box>
            ))}
          </VStack>

          <Divider my={4} />
          <Heading size="sm">Items</Heading>
          {(order.items || []).map((it, idx) => (
            <Box key={idx} mt={3} p={3} bg="gray.50" borderRadius="md">
              <Text><b>Crop:</b> {it.crop || it.lot?.crop || "N/A"}</Text>
              <Text><b>Lot:</b> {it.lot?.lotId || it.lotId || "N/A"}</Text>
              <Text><b>Qty:</b> {it.qtyKg} kg</Text>
              <Text><b>Price/kg:</b> ₹{it.pricePerKg ?? it.price}</Text>
              <Text><b>Subtotal:</b> ₹{it.total ?? Number(it.qtyKg) * Number(it.pricePerKg ?? it.price ?? 0)}</Text>
            </Box>
          ))}
        </CardBody></Card>
      )}
    </Container>
  );
}
