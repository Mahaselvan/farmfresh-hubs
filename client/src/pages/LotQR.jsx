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
  HStack,
  Skeleton,
  Text,
  useToast
} from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api/endpoints";

export default function LotQR() {
  const { id } = useParams(); // Mongo _id
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [lot, setLot] = useState(null);

  const fetchLot = async () => {
    try {
      setLoading(true);
      // Reuse existing endpoint (market lot detail works + populates hub)
      const res = await api.getLotDetails(id);
      // Depending on your marketController response:
      // - sometimes { data: { lot, timeline } }
      // - sometimes { data: lot }
      const payload = res.data.data;
      const realLot = payload?.lot ? payload.lot : payload;

      setLot(realLot);
    } catch (err) {
      toast({
        title: "Failed to load lot",
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
    fetchLot();
  }, [id]);

  const qrValue = lot?.qrString || lot?.lotId || id;

  return (
    <Container maxW="5xl" py={10}>
      <HStack justify="space-between" mb={4}>
        <Button as={RouterLink} to="/dashboard" variant="ghost">
          ← Back
        </Button>

        <Button onClick={() => window.print()} colorScheme="green" variant="outline">
          Print Slip 🧾
        </Button>
      </HStack>

      {loading ? (
        <Skeleton height="220px" />
      ) : !lot ? (
        <Text color="gray.500">Lot not found.</Text>
      ) : (
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={6}>
              <Box>
                <Heading size="lg">Lot QR Slip</Heading>

                <Text mt={2} color="gray.600">
                  Lot ID: <b>{lot.lotId}</b>
                </Text>

                <Box mt={3}>
                  <Badge colorScheme="green">{lot.status}</Badge>{" "}
                  {lot.grade && <Badge colorScheme="purple">Grade {lot.grade}</Badge>}
                </Box>

                <Divider my={4} />

                <Text><b>Farmer:</b> {lot.farmerName}</Text>
                <Text mt={1}><b>Phone:</b> {lot.phone}</Text>
                <Text mt={1}><b>Village:</b> {lot.village}</Text>
                <Text mt={1}><b>Crop:</b> {lot.crop}</Text>
                <Text mt={1}><b>Qty:</b> {lot.qtyKg} kg</Text>
                <Text mt={1}><b>Expected Price:</b> ₹{lot.expectedPrice}/kg</Text>
                <Text mt={1}>
                  <b>Hub:</b> {lot?.hubId?.name ? `${lot.hubId.name} (${lot.hubId.location})` : "—"}
                </Text>

                <Divider my={4} />

                <Text fontSize="sm" color="gray.600">
                  QR Value (for scanning):
                </Text>
                <Box
                  mt={2}
                  p={3}
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  fontFamily="mono"
                  fontSize="sm"
                >
                  {qrValue}
                </Box>
              </Box>

              <Box textAlign="center">
                <Box
                  p={4}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  bg="white"
                  display="inline-block"
                >
                  <QRCodeCanvas value={qrValue} size={220} includeMargin />
                </Box>

                <Text mt={3} fontSize="sm" color="gray.600">
                  Scan this at Hub intake / dispatch
                </Text>

                <Button
                  mt={3}
                  as={RouterLink}
                  to={`/trace/${lot._id}`}
                  colorScheme="green"
                  width="100%"
                >
                  Open Traceability
                </Button>
              </Box>
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          button, a { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </Container>
  );
}
