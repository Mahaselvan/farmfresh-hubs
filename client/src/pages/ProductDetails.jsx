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
  Input,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
  useToast
} from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { api } from "../api/endpoints";
import { useCart } from "../context/CartContext";

export default function ProductDetails() {
  const { lotId } = useParams();
  const toast = useToast();
  const { addToCart } = useCart();

  const [lot, setLot] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const fetchLot = async () => {
      try {
        setLoading(true);
        const res = await api.getMarketLot(lotId);
        setLot(res.data.data.lot);
        setTimeline(res.data.data.timeline || []);
      } catch (err) {
        toast({ title: "Failed to load product", description: err?.response?.data?.message || err.message, status: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchLot();
  }, [lotId, toast]);

  const handleAdd = () => {
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      toast({ title: "Quantity must be greater than 0.", status: "warning" });
      return;
    }
    if (q > Number(lot.availableQtyKg || lot.qtyKg || 0)) {
      toast({ title: `Only ${lot.availableQtyKg || lot.qtyKg} kg is currently available.`, status: "warning" });
      return;
    }
    addToCart(lot, q);
    toast({ title: "Added to cart", status: "success" });
  };

  return (
    <Container maxW="6xl" py={8}>
      <Button as={RouterLink} to="/market" variant="ghost" mb={4}>← Back to Market</Button>

      {loading ? <Skeleton height="260px" /> : !lot ? (
        <Text>Product not found.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card>
            <CardBody>
              <Heading>{lot.crop}</Heading>
              <Text mt={2} fontSize="2xl" fontWeight="700" color="green.700">₹{lot.expectedPrice}/kg</Text>
              <HStack mt={2}><Badge colorScheme="purple">Grade {lot.grade || "-"}</Badge><Badge colorScheme="green">{lot.status}</Badge></HStack>
              <Text mt={3}>Available: {lot.availableQtyKg ?? lot.qtyKg} kg</Text>
              <Text mt={2}>Origin: {lot.village}</Text>
              <Text mt={2}>Storage: {lot.hubId?.name} {lot.hubId?.location ? `(${lot.hubId.location})` : ""}</Text>

              <Divider my={4} />
              <Text fontWeight="700">Storage Monitoring</Text>
              <Text fontSize="sm" color="gray.600">Manual / Demo Reading</Text>
              <Text mt={2}>{lot.temp ?? "-"}°C</Text>
              <Text>{lot.humidity ?? "-"}% humidity</Text>

              <Divider my={4} />
              <Text fontWeight="700">Quantity</Text>
              <HStack mt={2}>
                <Button minW="44px" onClick={() => setQty((n) => Math.max(1, Number(n) - 1))}>-</Button>
                <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                <Button minW="44px" onClick={() => setQty((n) => Number(n) + 1)}>+</Button>
              </HStack>
              <Button mt={3} colorScheme="green" width="100%" onClick={handleAdd}>Add to Cart</Button>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Heading size="md">Where your produce came from</Heading>
              <VStack mt={4} align="stretch" spacing={3}>
                {timeline.length === 0 ? (
                  <Text color="gray.500">No traceability events yet.</Text>
                ) : timeline.map((event, idx) => (
                  <Box key={`${event.type}-${idx}`} p={3} bg="gray.50" borderRadius="md">
                    <Text fontWeight="700">{event.type.replaceAll("_", " ")}</Text>
                    {event.at ? <Text fontSize="sm">{new Date(event.at).toLocaleString()}</Text> : null}
                    {event.note ? <Text fontSize="sm" color="gray.600">{event.note}</Text> : null}
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}
    </Container>
  );
}
