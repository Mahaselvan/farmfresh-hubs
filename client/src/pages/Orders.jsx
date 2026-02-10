import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Skeleton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  useToast
} from "@chakra-ui/react";
import { api } from "../api/endpoints";
import { Link as RouterLink } from "react-router-dom";

const STATUS = ["PLACED", "DISPATCHED", "DELIVERED"];

const statusColor = (s) => {
  if (s === "PLACED") return "green";
  if (s === "DISPATCHED") return "blue";
  if (s === "DELIVERED") return "purple";
  return "gray";
};

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.getAllOrders(search ? { q: search } : {});
      setOrders(res.data.data || []);
    } catch (err) {
      toast({
        title: "Failed to load orders",
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      setSavingId(id);
      const res = await api.updateOrderStatus(id, { status });

      setOrders((prev) =>
        prev.map((o) => (o._id === id ? res.data.data : o))
      );

      toast({
        title: "Order updated ✅",
        status: "success",
        duration: 2000,
        isClosable: true
      });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Container maxW="7xl" py={10}>
      <Heading color="green.700">Orders Dashboard</Heading>
      <Text mt={2} color="gray.600">
        Public demo admin view — manage orders status.
      </Text>

      <Box mt={6} display="flex" gap={3}>
        <Input
          placeholder="Search orderId / customer / phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button colorScheme="green" onClick={fetchOrders}>
          Search
        </Button>
      </Box>

      <Box mt={8} border="1px solid" borderColor="gray.200" borderRadius="md" overflowX="auto">
        <Table size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th>Order ID</Th>
              <Th>Customer</Th>
              <Th>Phone</Th>
              <Th isNumeric>Total</Th>
              <Th>Status</Th>
              <Th>Change</Th>
              <Th>View</Th>
            </Tr>
          </Thead>

          <Tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <Tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <Td key={j}>
                      <Skeleton height="18px" />
                    </Td>
                  ))}
                </Tr>
              ))
            ) : orders.length === 0 ? (
              <Tr>
                <Td colSpan={7}>
                  <Text py={6} textAlign="center" color="gray.500">
                    No orders found.
                  </Text>
                </Td>
              </Tr>
            ) : (
              orders.map((o) => (
                <Tr key={o._id}>
                  <Td fontWeight="bold">{o.orderId}</Td>
                  <Td>{o.customerName}</Td>
                  <Td>{o.phone}</Td>
                  <Td isNumeric>₹{o.totalAmount}</Td>

                  <Td>
                    <Badge colorScheme={statusColor(o.status)}>
                      {o.status}
                    </Badge>
                  </Td>

                  <Td>
                    <Select
                      size="sm"
                      value={o.status}
                      isDisabled={savingId === o._id}
                      onChange={(e) => updateStatus(o._id, e.target.value)}
                    >
                      {STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </Td>

                  <Td>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="green"
                      as={RouterLink}
                      to={`/order/${o._id}`}
                    >
                      View
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
    </Container>
  );
}
