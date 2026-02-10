import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Container,
  Divider,
  Heading,
  Skeleton,
  Stack,
  Text,
  useToast
} from "@chakra-ui/react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { api } from "../api/endpoints";

export default function CheckoutSuccess() {
  const { orderId } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await api.getOrderById(orderId);
        setOrder(res.data.data);
      } catch (err) {
        toast({
          title: "Failed to load order",
          description: err?.response?.data?.message || err.message,
          status: "error",
          duration: 3000,
          isClosable: true
        });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [orderId, toast]);

  return (
    <Container maxW="6xl" py={10}>
      <Heading color="green.700">✅ Order Placed Successfully</Heading>
      <Text mt={2} color="gray.600">
        Payment simulated (MVP). Your order is confirmed.
      </Text>

      <Divider my={6} />

      {loading ? (
        <Skeleton height="200px" />
      ) : !order ? (
        <Text color="gray.500">Order not found.</Text>
      ) : (
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <Stack spacing={2}>
              <Text><b>Order ID:</b> {order.orderId}</Text>
              <Text><b>Status:</b> {order.status}</Text>
              <Text><b>Total:</b> ₹{order.totalAmount}</Text>
              <Text><b>Name:</b> {order.customerName}</Text>
              <Text><b>Phone:</b> {order.phone}</Text>
              <Text><b>Address:</b> {order.address}</Text>
            </Stack>

            <Divider my={4} />
            <Button as={RouterLink} to="/market" colorScheme="green">
              Continue Shopping
            </Button>
          </CardBody>
        </Card>
      )}
    </Container>
  );
}
