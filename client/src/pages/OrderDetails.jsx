import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Divider,
  Heading,
  Skeleton,
  Text,
  useToast
} from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { api } from "../api/endpoints";

function statusColor(status) {
  switch (status) {
    case "PLACED": return "blue";
    case "CONFIRMED": return "purple";
    case "PACKED": return "orange";
    case "DISPATCHED": return "cyan";
    case "DELIVERED": return "green";
    case "CANCELLED": return "red";
    default: return "gray";
  }
}

export default function OrderDetails() {
  const { orderId } = useParams();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.getOrderById(orderId);
      setOrder(res.data.data);
    } catch (err) {
      toast({
        title: "Failed to load order",
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 2500,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <Container maxW="6xl" py={10}>
      <Button as={RouterLink} to="/market" variant="ghost" mb={4}>
        ← Back to Market
      </Button>

      <Heading color="green.700">Order Tracking</Heading>
      <Text mt={2} color="gray.600">
        Order ID: <b>{orderId}</b>
      </Text>

      <Card mt={6} border="1px solid" borderColor="gray.200">
        <CardBody>
          {loading ? (
            <>
              <Skeleton height="20px" />
              <Skeleton mt={3} height="14px" />
              <Skeleton mt={3} height="14px" />
              <Skeleton mt={3} height="14px" />
            </>
          ) : !order ? (
            <Text color="gray.500">Order not found.</Text>
          ) : (
            <>
              <Box display="flex" alignItems="center" gap={3}>
                <Heading size="md">Status</Heading>
                <Badge colorScheme={statusColor(order.status)}>
                  {order.status || "PLACED"}
                </Badge>
              </Box>

              <Divider my={4} />

              <Text><b>Customer:</b> {order.customerName || "—"}</Text>
              <Text mt={2}><b>Phone:</b> {order.phone || "—"}</Text>
              <Text mt={2}><b>Address:</b> {order.address || "—"}</Text>

              <Divider my={4} />

              <Text><b>Total Amount:</b> ₹{order.totalAmount ?? order.total ?? "—"}</Text>
              <Text mt={2}><b>Created:</b> {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</Text>

              <Button mt={5} onClick={fetchOrder} variant="outline" colorScheme="green">
                Refresh
              </Button>
            </>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
