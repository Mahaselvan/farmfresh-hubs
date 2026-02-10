import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Container,
  Divider,
  Heading,
  Skeleton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  Button,
  useToast
} from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { api } from "../api/endpoints";

export default function Ledger() {
  const { lotId } = useParams();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await api.getLotLedger(lotId);
      setData(res.data.data);
    } catch (err) {
      toast({
        title: "Failed to load ledger",
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
    fetchLedger();
  }, [lotId]);

  if (loading) {
    return (
      <Container maxW="6xl" py={10}>
        <Skeleton height="200px" />
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxW="6xl" py={10}>
        <Text color="gray.500">Ledger not found.</Text>
      </Container>
    );
  }

  const { lot, estimatedValue, payment } = data;
    const rawDeductions = payment?.deductions;

  // ✅ Ensure deductions is always an array
  const deductions = Array.isArray(rawDeductions)
    ? rawDeductions
    : typeof rawDeductions === "string"
    ? (() => {
        try {
          const parsed = JSON.parse(rawDeductions);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })()
    : [];

  const deductionSum = deductions.reduce((s, d) => s + Number(d.amount || 0), 0);
  const advance = Number(payment?.advanceAmount || 0);
  const final = Number(payment?.finalAmount || 0);

  return (
    <Container maxW="6xl" py={10}>
      <Button as={RouterLink} to="/dashboard" variant="ghost" mb={4}>
        ← Back to Dashboard
      </Button>

      <Heading color="green.700">Ledger</Heading>
      <Text mt={2} color="gray.600">
        Advance + deductions + final settlement (demo).
      </Text>

      <Box mt={6} border="1px solid" borderColor="gray.200" p={5} borderRadius="md">
        <Text><b>Lot ID:</b> {lot.lotId}</Text>
        <Text><b>Crop:</b> {lot.crop}</Text>
        <Text><b>Farmer:</b> {lot.farmerName}</Text>
        <Text><b>Status:</b> <Badge colorScheme="purple">{lot.status}</Badge></Text>
        <Text mt={2}><b>Estimated Value:</b> ₹{estimatedValue}</Text>
      </Box>

      <Divider my={6} />

      <Heading size="md">Payments Breakdown</Heading>

      <Table mt={4} size="sm">
        <Thead>
          <Tr>
            <Th>Type</Th>
            <Th isNumeric>Amount (₹)</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>Advance (50%)</Td>
            <Td isNumeric>{advance}</Td>
          </Tr>

        {deductions.map((d, idx) => (
  <Tr key={idx}>
    <Td>Deduction: {d.label}</Td>
    <Td isNumeric>{d.amount}</Td>
  </Tr>
))}


          <Tr>
            <Td><b>Total Deductions</b></Td>
            <Td isNumeric><b>{deductionSum}</b></Td>
          </Tr>

          <Tr>
            <Td><b>Final Amount to Farmer</b></Td>
            <Td isNumeric><b>{final}</b></Td>
          </Tr>
        </Tbody>
      </Table>

      <Text mt={4} color="gray.600" fontSize="sm">
        Final settlement is computed after SOLD/SETTLED.
      </Text>
    </Container>
  );
}
