import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Heading,
  Input,
  SimpleGrid,
  Skeleton,
  Text,
  useToast,
  Card,
  CardBody,
  Stack,
  HStack
} from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { api } from "../api/endpoints";
import { useCart } from "../context/CartContext";

const STATUS_STEPS = ["RECEIVED", "STORED", "LISTED", "SOLD", "SETTLED"];

function StepItem({ title, state }) {
  // state: "done" | "active" | "todo"
  const dotBg =
    state === "done" ? "green.500" : state === "active" ? "brand.700" : "gray.200";

  return (
    <HStack align="start" spacing={3}>
      <Box w="10px" h="10px" borderRadius="full" bg={dotBg} mt={2} />
      <Box>
        <Text fontWeight="700">{title}</Text>
        <Text fontSize="sm" color="gray.600">
          {state === "done" ? "Completed" : state === "active" ? "Current" : "Upcoming"}
        </Text>
      </Box>
    </HStack>
  );
}

export default function ProductDetails() {
  // IMPORTANT: route should be /market/:lotId
  const { lotId } = useParams();

  const toast = useToast();
  const { addToCart } = useCart();

  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  const fetchLot = async () => {
    try {
      setLoading(true);
      // API name must exist in endpoints.js
      const res = await api.getMarketLot(lotId);
      setLot(res.data.data.lot);
    } catch (err) {
      toast({
        title: "Failed to load product",
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 3000,
        isClosable: true
      });
      setLot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotId]);

  const timeline = useMemo(() => {
    const idx = lot ? STATUS_STEPS.indexOf(lot.status) : -1;
    const labels = [
      "🌱 Farm → Hub received",
      "❄ Cold storage active",
      "🛒 Listed on marketplace",
      "📦 Sold / Dispatched",
      "💰 Settled to farmer"
    ];

    return STATUS_STEPS.map((s, i) => ({
      key: s,
      title: labels[i],
      state: idx === i ? "active" : idx > i ? "done" : "todo"
    }));
  }, [lot]);

  const handleAdd = () => {
    if (!lot) return;

    const q = Number(qty);

    if (!Number.isFinite(q) || q <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than 0",
        status: "warning",
        duration: 2500,
        isClosable: true
      });
      return;
    }

    if (q > Number(lot.qtyKg)) {
      toast({
        title: "Not enough stock",
        description: `Only ${lot.qtyKg} kg available`,
        status: "warning",
        duration: 2500,
        isClosable: true
      });
      return;
    }

    addToCart(lot, q);

    toast({
      title: "Added to cart 🛒",
      description: `${q} kg added`,
      status: "success",
      duration: 2500,
      isClosable: true
    });
  };

  return (
    <Container maxW="6xl" py={10}>
      <Button as={RouterLink} to="/market" variant="ghost" mb={4}>
        ← Back to Market
      </Button>

      {loading ? (
        <Skeleton height="240px" />
      ) : !lot ? (
        <Text color="gray.500">Product not found.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          {/* LEFT: Product */}
          <Card border="1px solid" borderColor="gray.200">
            <CardBody>
              <Heading>{lot.crop}</Heading>

              <Text mt={2} color="gray.600">
                Lot ID: <b>{lot.lotId}</b>
              </Text>

              <Box mt={3}>
                <Badge colorScheme="green">{lot.status}</Badge>{" "}
                {lot.grade && <Badge colorScheme="purple">Grade {lot.grade}</Badge>}
                {lot.hubId?.name && (
                  <Badge ml={2} colorScheme="blue">
                    {lot.hubId.name}
                  </Badge>
                )}
              </Box>

              <Text mt={4} fontSize="2xl" fontWeight="bold" color="brand.700">
                ₹{lot.expectedPrice}/kg
              </Text>

              <Text mt={2} color="gray.600">
                Available stock: <b>{lot.qtyKg} kg</b>
              </Text>

              <Divider my={5} />

              <Heading size="sm">Add to Cart</Heading>

              <Input
                mt={2}
                type="number"
                value={qty}
                min={1}
                max={Number(lot.qtyKg)}
                onChange={(e) => setQty(Number(e.target.value))}
              />

              <Button mt={3} colorScheme="green" width="100%" onClick={handleAdd}>
                Add to Cart
              </Button>

              <Button
                mt={2}
                as={RouterLink}
                to="/cart"
                width="100%"
                variant="outline"
                colorScheme="green"
              >
                Go to Cart
              </Button>
            </CardBody>
          </Card>

          {/* RIGHT: Timeline */}
          <Card border="1px solid" borderColor="gray.200">
            <CardBody>
              <Heading size="md">Traceability Timeline</Heading>
              <Text mt={2} color="gray.600">
                Farm → Hub → Storage → Listing → Dispatch → Settlement (demo).
              </Text>

              <Divider my={4} />

              <Stack spacing={4}>
                {timeline.map((t) => (
                  <StepItem key={t.key} title={t.title} state={t.state} />
                ))}
              </Stack>

              <Divider my={4} />

              <Box>
                <Text>
                  <b>🌱 Farm:</b> {lot.village}
                </Text>
                <Text mt={2}>
                  <b>🏢 Hub:</b> {lot.hubId?.name || "—"} {lot.hubId?.location ? `(${lot.hubId.location})` : ""}
                </Text>
                <Text mt={2}>
                  <b>❄ Storage:</b> Temp {lot.temp ?? "—"}°C | Humidity {lot.humidity ?? "—"}%
                </Text>
                <Text mt={2}>
                  <b>📦 Packing Notes:</b> {lot.packingNotes || "—"}
                </Text>
                <Text mt={2}>
                  <b>📅 Created:</b> {new Date(lot.createdAt).toLocaleString()}
                </Text>
              </Box>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}
    </Container>
  );
}
