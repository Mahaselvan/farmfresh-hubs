import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Card,
  CardBody,
  Container,
  Divider,
  Heading,
  HStack,
  Skeleton,
  Text,
  useToast
} from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { api } from "../api/endpoints";

export default function Trace() {
  const { id } = useParams(); // lot Mongo _id
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [lot, setLot] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const fetchTrace = async () => {
    try {
      setLoading(true);
      const res = await api.getLotDetails(id);
      const payload = res.data.data;

      // supports both shapes
      if (payload?.lot) {
        setLot(payload.lot);
        setTimeline(payload.timeline || []);
      } else {
        setLot(payload);
        setTimeline([
          { step: "FARM", at: payload.createdAt, note: `${payload.farmerName} booked ${payload.crop}` },
          { step: "HUB", at: payload.createdAt, note: `Assigned to hub` },
          { step: "STORAGE", at: payload.updatedAt, note: `Current status: ${payload.status}` }
        ]);
      }
    } catch (err) {
      toast({
        title: "Failed to load trace",
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
    fetchTrace();
  }, [id]);

  return (
    <Container maxW="5xl" py={10}>
      <HStack justify="space-between" mb={4}>
        <Text as={RouterLink} to="/market" style={{ fontWeight: 600 }}>
          ← Back to Market
        </Text>

        <Text as={RouterLink} to={`/qr/${id}`} style={{ fontWeight: 600, color: "#1f6f3e" }}>
          View QR Slip →
        </Text>
      </HStack>

      {loading ? (
        <Skeleton height="200px" />
      ) : !lot ? (
        <Text color="gray.500">Lot not found.</Text>
      ) : (
        <>
          <Card border="1px solid" borderColor="gray.200">
            <CardBody>
              <Heading size="lg">Traceability</Heading>
              <Text mt={2} color="gray.600">
                Lot <b>{lot.lotId}</b> • {lot.crop} • {lot.qtyKg} kg
              </Text>

              <Box mt={3}>
                <Badge colorScheme="green">{lot.status}</Badge>{" "}
                {lot.grade && <Badge colorScheme="purple">Grade {lot.grade}</Badge>}
              </Box>

              <Divider my={4} />

              <Text><b>Origin:</b> {lot.village}</Text>
              <Text mt={1}><b>Hub:</b> {lot?.hubId?.name ? `${lot.hubId.name} (${lot.hubId.location})` : "—"}</Text>
              <Text mt={1}><b>Storage:</b> Temp {lot.temp ?? "—"}°C | Humidity {lot.humidity ?? "—"}%</Text>
            </CardBody>
          </Card>

          <Card mt={6} border="1px solid" borderColor="gray.200">
            <CardBody>
              <Heading size="md">Timeline</Heading>

              <Box mt={4} display="grid" gap={3}>
                {timeline.length === 0 ? (
                  <Text color="gray.500">No timeline available.</Text>
                ) : (
                  timeline.map((x, idx) => (
                    <Box key={idx} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                      <HStack justify="space-between">
                        <Badge colorScheme="blue">{x.step}</Badge>
                        <Text fontSize="sm" color="gray.600">
                          {x.at ? new Date(x.at).toLocaleString() : "—"}
                        </Text>
                      </HStack>
                      <Text mt={2}>{x.note}</Text>
                    </Box>
                  ))
                )}
              </Box>
            </CardBody>
          </Card>
        </>
      )}
    </Container>
  );
}
