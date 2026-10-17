import { useEffect, useState } from "react";
import { Badge, Box, Button, Card, CardBody, Container, Divider, Heading, Skeleton, Text } from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import QRCode from "qrcode";
import { api } from "../api/endpoints";

export default function QrSlip() {
  const { lotId } = useParams();
  const [lot, setLot] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.getTrace(lotId);
        const lotData = res.data.data?.lot;
        setLot(lotData || null);
        const qr = await QRCode.toDataURL(lotData?.lotId || lotId);
        setQrUrl(qr);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lotId]);

  return (
    <Container maxW="4xl" py={8}>
      <Button as={RouterLink} to="/farmer" variant="ghost" mb={4}>← Back</Button>
      <Heading color="green.700">QR Slip</Heading>
      <Text mt={2}>Share this slip to view produce traceability.</Text>
      <Divider my={6} />

      {loading ? <Skeleton height="300px" /> : !lot ? (
        <Text color="red.500">Lot not found.</Text>
      ) : (
        <Card>
          <CardBody>
            <Text><b>Lot ID:</b> <Badge colorScheme="green">{lot.lotId}</Badge></Text>
            <Text mt={2}><b>Crop:</b> {lot.crop}</Text>
            <Text mt={2}><b>Origin:</b> {lot.village}</Text>
            <Text mt={2}><b>Quantity:</b> {lot.qtyKg} kg</Text>
            <Text mt={2}><b>Status:</b> {lot.status}</Text>
            <Divider my={5} />
            <Box textAlign="center"><img src={qrUrl} alt="QR Code" style={{ margin: "auto", width: "220px" }} /></Box>
          </CardBody>
        </Card>
      )}
    </Container>
  );
}
