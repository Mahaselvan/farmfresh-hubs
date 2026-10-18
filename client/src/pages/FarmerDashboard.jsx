import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Text,
  VStack
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.getMyLots();
        setLots(res.data.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const summary = useMemo(() => {
    const total = lots.length;
    const stored = lots.filter((l) => ["RECEIVED", "STORED", "LISTED", "PARTIALLY_SOLD"].includes(l.status)).length;
    const paid = lots.reduce((sum, lot) => sum + Number(lot.originalQtyKg || lot.qtyKg || 0) * Number(lot.expectedPrice || 0), 0);
    return { total, stored, paid, notifications: 0 };
  }, [lots]);

  return (
    <Container maxW="6xl" py={6}>
      <Heading size="lg" color="green.700">Welcome, {user?.name || "Farmer"}</Heading>

      <SimpleGrid mt={5} columns={{ base: 2, md: 4 }} spacing={3}>
        <Card><CardBody><Text fontSize="sm">MY PRODUCE</Text><Heading size="md">{summary.total}</Heading><Text fontSize="xs">bookings</Text></CardBody></Card>
        <Card><CardBody><Text fontSize="sm">STORED NOW</Text><Heading size="md">{summary.stored}</Heading><Text fontSize="xs">lots</Text></CardBody></Card>
        <Card><CardBody><Text fontSize="sm">PAYMENTS</Text><Heading size="md">{money(summary.paid)}</Heading><Text fontSize="xs">estimated value</Text></CardBody></Card>
        <Card><CardBody><Text fontSize="sm">NOTIFICATIONS</Text><Heading size="md">{summary.notifications}</Heading><Text fontSize="xs">unread</Text></CardBody></Card>
      </SimpleGrid>

      <Heading mt={7} size="md">Quick Actions</Heading>
      <SimpleGrid mt={3} columns={{ base: 2, md: 4 }} spacing={3}>
        <Button as={RouterLink} to="/booking" h="44px" colorScheme="green">Book Storage</Button>
        <Button as={RouterLink} to="/farmer" h="44px" variant="outline" colorScheme="green">My Produce</Button>
        <Button as={RouterLink} to="/notifications" h="44px" variant="outline">Payments</Button>
        <Button as={RouterLink} to="/notifications" h="44px" variant="outline">QR Slips</Button>
      </SimpleGrid>

      <Heading mt={7} size="md">Recent Produce</Heading>
      <VStack mt={3} spacing={3} align="stretch">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} height="120px" />)
        ) : lots.length === 0 ? (
          <Card><CardBody><Text>No produce booked yet.</Text><Button as={RouterLink} to="/booking" mt={3} colorScheme="green">Book Storage</Button></CardBody></Card>
        ) : (
          lots.slice(0, 6).map((lot) => (
            <Card key={lot._id}>
              <CardBody>
                <HStack justify="space-between" align="start">
                  <Box>
                    <Text fontWeight="700">{lot.crop}</Text>
                    <Text fontSize="sm">{lot.qtyKg} kg</Text>
                    <Text fontSize="sm">Hub: {lot.hubId?.name || "-"}</Text>
                    <HStack mt={2}><Badge colorScheme="green">{lot.status}</Badge><Text fontSize="sm">Storage: {Math.min(lot.storageDays || 0, lot.storageDays || 0)} / {lot.storageDays} days</Text></HStack>
                  </Box>
                  <VStack>
                    <Button as={RouterLink} to={`/trace/${lot._id}`} size="sm" variant="outline">View Details</Button>
                    <Button as={RouterLink} to={`/qr/${lot._id}`} size="sm" colorScheme="green">QR Slip</Button>
                  </VStack>
                </HStack>
              </CardBody>
            </Card>
          ))
        )}
      </VStack>
    </Container>
  );
}
