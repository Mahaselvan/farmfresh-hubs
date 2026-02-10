import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
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

export default function Alerts() {
  const toast = useToast();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

 const fetchAlerts = useCallback(async () => {
  try {
    setLoading(true);
    const res = await api.getAlerts();
    setLots(res.data.data || []);
  } catch (err) {
    toast({
      title: "Failed to load alerts",
      description: err?.response?.data?.message || err.message,
      status: "error",
      duration: 3000,
      isClosable: true
    });
  } finally {
    setLoading(false);
  }
}, [toast]);


useEffect(() => {
  fetchAlerts();
}, [fetchAlerts]);


  return (
    <Container maxW="7xl" py={10}>
      <Heading color="green.700">Storage Alerts</Heading>
      <Text mt={2} color="gray.600">
        Lots with temp/humidity outside safe range (demo).
      </Text>

      <Button mt={4} onClick={fetchAlerts} variant="outline" colorScheme="green">
        Refresh
      </Button>

      <Box mt={6} border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden">
        <Table size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th>Lot</Th>
              <Th>Crop</Th>
              <Th>Temp (°C)</Th>
              <Th>Humidity (%)</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <Tr key={i}>
                  <Td colSpan={5}><Skeleton height="20px" /></Td>
                </Tr>
              ))
            ) : lots.length === 0 ? (
              <Tr>
                <Td colSpan={5}>
                  <Text py={6} textAlign="center" color="gray.500">
                    No alerts 🎉
                  </Text>
                </Td>
              </Tr>
            ) : (
              lots.map((l) => (
                <Tr key={l._id}>
                  <Td>
                    <Text fontWeight="bold">{l.lotId}</Text>
                    <Badge mt={1} colorScheme="red">ALERT</Badge>
                  </Td>
                  <Td>{l.crop}</Td>
                  <Td>{l.temp ?? "—"}</Td>
                  <Td>{l.humidity ?? "—"}</Td>
                  <Td><Badge colorScheme="purple">{l.status}</Badge></Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
    </Container>
  );
}
