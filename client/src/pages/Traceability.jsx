import { useEffect, useState } from "react";
import { Badge, Card, CardBody, Container, Divider, Heading, HStack, Skeleton, Text, VStack } from "@chakra-ui/react";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import { api } from "../api/endpoints";

export default function Traceability() {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrace = async () => {
      try {
        setLoading(true);
        const res = await api.getTrace(lotId);
        setData(res.data.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTrace();
  }, [lotId]);

  const lot = data?.lot;
  const timeline = data?.timeline || [];

  return (
    <Container maxW="5xl" py={8}>
      <HStack justify="space-between" mb={4}>
        <Text as="button" type="button" onClick={() => navigate(-1)} fontWeight={600}>← Back</Text>
        <Text as={RouterLink} to={`/qr/${lotId}`} fontWeight={600} color="green.700">View QR Slip →</Text>
      </HStack>
      <Heading color="green.700">Where your produce went</Heading>
      <Text mt={2} color="gray.600">Only recorded traceability events are shown.</Text>

      <Card mt={6}>
        <CardBody>
          {loading ? <Skeleton height="200px" /> : !lot ? (
            <Text>Lot not found</Text>
          ) : (
            <>
              <Text><b>Lot ID:</b> {lot.lotId}</Text>
              <Text mt={2}><b>Crop:</b> {lot.crop}</Text>
              <Text mt={2}><b>Origin village:</b> {lot.village}</Text>
              <Text mt={2}><b>Hub:</b> {lot.hub?.name} ({lot.hub?.location})</Text>
              <Text mt={2}><b>Status:</b> <Badge colorScheme="purple">{lot.status}</Badge></Text>
              <Text mt={2}><b>Storage Monitoring:</b> {lot.temp ?? "-"}°C, {lot.humidity ?? "-"}% (Manual / Demo Reading)</Text>

              <Divider my={4} />
              <Heading size="sm">Timeline</Heading>
              <VStack mt={3} spacing={3} align="stretch">
                {timeline.length === 0 ? <Text color="gray.500">No events available.</Text> : timeline.map((event, idx) => (
                  <Card key={`${event.type}-${idx}`} variant="outline"><CardBody>
                    <Text fontWeight="700">{event.type.replaceAll("_", " ")}</Text>
                    {event.at ? <Text fontSize="sm">{new Date(event.at).toLocaleString()}</Text> : null}
                    {event.note ? <Text fontSize="sm" color="gray.600">{event.note}</Text> : null}
                  </CardBody></Card>
                ))}
              </VStack>
            </>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
