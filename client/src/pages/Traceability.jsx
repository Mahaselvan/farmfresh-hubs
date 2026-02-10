import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  CardBody,
  Container,
  Divider,
  Heading,
  HStack,
  Skeleton,
  Text
} from "@chakra-ui/react";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import { api } from "../api/endpoints";
export default function Traceability() {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchLot = async () => {
      try {
        setLoading(true);
        const res = await api.getLotById(lotId);
        setLot(res.data.data);
      } catch (err) {
        console.error("Trace fetch failed", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLot();
  }, [lotId]);
  return (
    <Container maxW="5xl" py={10}>
      <HStack justify="space-between" mb={4}>
        <Text
          as="button"
          type="button"
          onClick={() => navigate(-1)}
          fontWeight={600}
        >
          ← Back
        </Text>

        <Text
          as={RouterLink}
          to={`/qr/${lotId}`}
          fontWeight={600}
          color="green.700"
        >
          View QR Slip →
        </Text>
      </HStack>
      <Heading color="green.700">Produce Traceability</Heading>
      <Text mt={2} color="gray.600">
        {"Transparency from farm -> hub -> storage"}
      </Text>
      <Card mt={6}>
        <CardBody>
          {loading ? (
            <Skeleton height="200px" />
          ) : !lot ? (
            <Text>Lot not found</Text>
          ) : (
            <>
              <Text><b>Farmer:</b> {lot.farmerName}</Text>
              <Text mt={2}><b>Village:</b> {lot.village}</Text>
              <Text mt={2}><b>Crop:</b> {lot.crop}</Text>
              <Text mt={2}><b>Quantity:</b> {lot.qtyKg} kg</Text>
              <Divider my={4} />
              <Text>
                <b>Hub:</b> {lot.hubId?.name} ({lot.hubId?.location})
              </Text>
              <Text mt={3}>
                <b>Status:</b>{" "}
                <Badge colorScheme="purple">{lot.status}</Badge>
              </Text>
              <Divider my={4} />
              <Text><b>Created At:</b> {new Date(lot.createdAt).toLocaleString()}</Text>
              <Divider my={4} />
              <Text fontWeight="bold">Storage Conditions (Demo)</Text>
              <Text mt={1}>Temperature: 4-6 C</Text>
              <Text>Humidity: 85-90%</Text>
            </>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
