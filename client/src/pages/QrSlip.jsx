import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Divider,
  Heading,
  Text,
  Badge,
  Skeleton
} from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import QRCode from "qrcode";
import { api } from "../api/endpoints";

export default function QrSlip() {
  const { id } = useParams();
  const [lot, setLot] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLot = async () => {
    try {
      setLoading(true);

      const res = await api.getMarketLot(id);
      const lotData = res.data.data;

      setLot(lotData);

      const qr = await QRCode.toDataURL(lotData.qrString || lotData.lotId);
      setQrUrl(qr);
    } catch (err) {
      console.log("QR fetch failed", err.message);
    } finally {
      setLoading(false);
    }
  };
const { lotId } = useParams();

useEffect(() => {
  api.getLotById(lotId)
    .then(res => setLot(res.data.data))
    .finally(() => setLoading(false));
}, [lotId]);


  const handlePrint = () => window.print();

  return (
    <Container maxW="5xl" py={10}>
      <Button as={RouterLink} to="/booking" variant="ghost" mb={4}>
        ← Back to Booking
      </Button>

      <Heading color="green.700">QR Slip</Heading>
      <Text mt={2} color="gray.600">
        Print this slip and attach it to the lot bag.
      </Text>

      <Divider my={6} />

      {loading ? (
        <Skeleton height="300px" />
      ) : !lot ? (
        <Text color="red.500">Lot not found.</Text>
      ) : (
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <Heading size="md">{lot.crop}</Heading>

            <Text mt={2}>
              <b>Lot ID:</b> <Badge colorScheme="green">{lot.lotId}</Badge>
            </Text>

            <Text mt={2}>
              <b>Farmer:</b> {lot.farmerName}
            </Text>

            <Text mt={2}>
              <b>Village:</b> {lot.village}
            </Text>

            <Text mt={2}>
              <b>Quantity:</b> {lot.qtyKg} kg
            </Text>

            <Text mt={2}>
              <b>Expected Price:</b> ₹{lot.expectedPrice}/kg
            </Text>

            <Text mt={2}>
              <b>Status:</b>{" "}
              <Badge colorScheme="purple">{lot.status}</Badge>
            </Text>

            <Divider my={5} />

            <Box textAlign="center">
              <img
                src={qrUrl}
                alt="QR Code"
                style={{ margin: "auto", width: "220px" }}
              />

              <Text mt={3} fontSize="sm" color="gray.600">
                QR Data: {lot.qrString}
              </Text>
            </Box>

            <Button mt={6} colorScheme="green" width="100%" onClick={handlePrint}>
              Print QR Slip
            </Button>
          </CardBody>
        </Card>
      )}
    </Container>
  );
}
