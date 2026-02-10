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
  Text
} from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import { CheckIcon } from "@chakra-ui/icons";
import { Flex, Circle } from "@chakra-ui/react";
const ORDER_STEPS = ["PLACED", "PACKING", "DISPATCHED", "DELIVERED"];

function stepIndex(status) {
  const i = ORDER_STEPS.indexOf(status);
  return i === -1 ? 0 : i;
}

function OrderTimeline({ status }) {
  const active = stepIndex(status);

  return (
    <Box mt={5}>
      <Flex align="center" justify="space-between">
        {ORDER_STEPS.map((s, idx) => {
          const done = idx < active;
          const current = idx === active;

          return (
            <Flex key={s} direction="column" align="center" flex="1" position="relative">
              {/* Line to next */}
              {idx !== ORDER_STEPS.length - 1 && (
                <Box
                  position="absolute"
                  top="14px"
                  left="50%"
                  width="100%"
                  height="2px"
                  bg={idx < active ? "green.400" : "gray.200"}
                  zIndex={0}
                />
              )}

              {/* Dot */}
              <Circle
                size="28px"
                bg={done || current ? "green.500" : "gray.200"}
                color={done || current ? "white" : "gray.500"}
                zIndex={1}
              >
                {done ? <CheckIcon boxSize="12px" /> : idx + 1}
              </Circle>

              {/* Label */}
              <Text
                mt={2}
                fontSize="xs"
                fontWeight={current ? "700" : "600"}
                color={done || current ? "green.700" : "gray.500"}
                textAlign="center"
              >
                {s}
              </Text>
            </Flex>
          );
        })}
      </Flex>

      <Text mt={3} fontSize="sm" color="gray.600">
        Current status: <b>{status}</b>
      </Text>
    </Box>
  );
}
export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.getOrderById(orderId);
      setOrder(res.data.data);
    } catch (err) {
      console.log("Order fetch failed:", err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  return (
    <Container maxW="4xl" py={10}>
      <Heading color="green.700">Order Tracking</Heading>
      <Text mt={2} color="gray.600">
        Track your order status in real-time.
      </Text>

      <Divider my={6} />

      {loading ? (
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <Skeleton height="20px" />
            <Skeleton mt={3} height="15px" />
            <Skeleton mt={3} height="15px" />
          </CardBody>
        </Card>
      ) : !order ? (
        <Text color="red.500">Order not found.</Text>
      ) : (
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <Heading size="md">
              Order ID: <Text as="span" color="green.700">{order.orderId}</Text>
            </Heading>

            <Box mt={3}>
              <Text>
                <b>Status:</b>{" "}
                <Badge colorScheme={statusColor(order.status)}>
                  {order.status}
                </Badge>
              </Text>
               <OrderTimeline status={order.status} />
              <Text mt={2}>
                <b>Total Amount:</b> ₹{order.totalAmount}
              </Text>

              <Text mt={2}>
                <b>Created At:</b>{" "}
                {new Date(order.createdAt).toLocaleString()}
              </Text>
            </Box>

            <Divider my={4} />

            <Heading size="sm">Items</Heading>

            {order.items.map((it, idx) => (
              <Box key={idx} mt={3} p={3} bg="gray.50" borderRadius="md">
                <Text><b>Crop:</b> {it.lot?.crop || "N/A"}</Text>
                <Text><b>Lot:</b> {it.lot?.lotId || "N/A"}</Text>
                <Text><b>Qty:</b> {it.qtyKg} kg</Text>
                <Text><b>Price/kg:</b> ₹{it.pricePerKg}</Text>
                <Text><b>Subtotal:</b> ₹{it.qtyKg * it.pricePerKg}</Text>
              </Box>
            ))}
          </CardBody>
        </Card>
      )}
    </Container>
  );
}
