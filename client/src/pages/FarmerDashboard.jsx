import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Divider,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Skeleton,
  Text
} from "@chakra-ui/react";
import { api } from "../api/endpoints";
import { Link as RouterLink } from "react-router-dom";

export default function FarmerDashboard() {
  const [phone, setPhone] = useState("");
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLots = async () => {
    if (!phone.trim()) return;

    try {
      setLoading(true);
      const res = await api.getFarmerLots(phone.trim());
      setLots(res.data.data || []);
    } catch (err) {
      console.error("Farmer lots fetch failed", err.message);
      setLots([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="7xl" py={10}>
      <Heading color="green.700">Farmer Dashboard</Heading>
      <Text mt={2} color="gray.600">
        Enter your phone number to view all your booked lots.
      </Text>

      <Card mt={6}>
        <CardBody>
          <HStack spacing={3}>
            <Input
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button colorScheme="green" onClick={fetchLots} isLoading={loading}>
              Search
            </Button>
          </HStack>
        </CardBody>
      </Card>

      <Divider my={6} />

      {loading ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height="150px" />
          ))}
        </SimpleGrid>
      ) : lots.length === 0 ? (
        <Text color="gray.500" textAlign="center">
          No lots found. Try booking first.
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          {lots.map((lot) => (
            <Card key={lot._id} border="1px solid" borderColor="gray.200">
              <CardBody>
                <Heading size="sm">{lot.lotId}</Heading>

                <Text mt={2}><b>Crop:</b> {lot.crop}</Text>
                <Text><b>Village:</b> {lot.village}</Text>
                <Text><b>Qty:</b> {lot.qtyKg} kg</Text>

                <Text mt={2}>
                  <b>Status:</b>{" "}
                  <Badge colorScheme="purple">{lot.status}</Badge>
                </Text>

                <Text mt={2} fontSize="sm" color="gray.600">
                  Hub: {lot.hubId?.name} ({lot.hubId?.location})
                </Text>

                <Divider my={4} />

                <HStack spacing={3}>
                  <Button
                    as={RouterLink}
                    to={`/qr/${lot._id}`}
                    size="sm"
                    colorScheme="green"
                  >
                    QR Slip
                  </Button>

                  <Button
                    as={RouterLink}
                    to={`/trace/${lot._id}`}
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                  >
                    Trace
                  </Button>

                  <Button
                    as={RouterLink}
                    to={`/ledger/${lot._id}`}
                    size="sm"
                    variant="outline"
                    colorScheme="purple"
                  >
                    Ledger
                  </Button>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}
