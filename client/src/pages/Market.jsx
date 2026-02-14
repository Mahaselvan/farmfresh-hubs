import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Skeleton,
  Text,
  useToast
} from "@chakra-ui/react";
import { api } from "../api/endpoints";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Market() {
  const toast = useToast();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [lots, setLots] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: "",
    crop: "",
    hubId: "",
    grade: ""
  });
  const [qtyById, setQtyById] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [lotRes, hubRes] = await Promise.all([
        api.getListedLots(),
        api.getHubs()
      ]);

      setLots(lotRes.data.data || []);
      setHubs(hubRes.data.data || []);
    } catch (err) {
      toast({
        title: "Failed to load marketplace",
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
  fetchData();

  const t = setInterval(fetchData, 6000);

  const onFocus = () => fetchData();
  window.addEventListener("focus", onFocus);

  const onVis = () => {
    if (document.visibilityState === "visible") fetchData();
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    clearInterval(t);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVis);
  };
}, []);


  const hubMap = useMemo(() => {
    const map = new Map();
    hubs.forEach((h) => map.set(h._id, h));
    return map;
  }, [hubs]);

  const uniqueCrops = useMemo(() => {
    const s = new Set(lots.map((l) => l.crop).filter(Boolean));
    return Array.from(s).sort();
  }, [lots]);

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const search = filters.search.toLowerCase().trim();

      const matchesSearch =
        !search ||
        lot.crop?.toLowerCase().includes(search) ||
        lot.lotId?.toLowerCase().includes(search) ||
        lot.farmerName?.toLowerCase().includes(search);

      const matchesCrop = !filters.crop || lot.crop === filters.crop;
      const lotHubId = typeof lot.hubId === "object" ? lot.hubId?._id : lot.hubId;
      const matchesHub = !filters.hubId || String(lotHubId) === String(filters.hubId);
      const matchesGrade = !filters.grade || lot.grade === filters.grade;

      return matchesSearch && matchesCrop && matchesHub && matchesGrade;
    });
  }, [lots, filters]);
const statusColor = (status) => {
  const map = {
    RECEIVED: "gray",
    STORED: "blue",
    LISTED: "green",
    SOLD: "red",
    SETTLED: "purple"
  };
  return map[status] || "gray";
};

  const handleAdd = (lot) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please sign in to add items to cart.",
        status: "info",
        duration: 2000,
        isClosable: true
      });
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (!lot) return;

    const q = Number(qtyById[lot._id] ?? 1);

    if (!Number.isFinite(q) || q <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than 0",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (q > Number(lot.qtyKg)) {
      toast({
        title: "Not enough stock",
        description: `Only ${lot.qtyKg} kg available`,
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (Number(lot.qtyKg) <= 0) {
      toast({
        title: "Out of stock",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    addToCart(lot, q);
    toast({
      title: "Added to cart",
      description: `${q} kg added`,
      status: "success",
      duration: 2000,
      isClosable: true
    });
  };

  return (
    <Container maxW="7xl" py={10}>
      <Heading color="green.700">Consumer Marketplace</Heading>
      <Text mt={2} color="gray.600">
        Browse LISTED lots/products directly from hubs.
      </Text>

      <SimpleGrid mt={6} columns={{ base: 1, md: 4 }} spacing={4}>
        <Input
          placeholder="Search crop / lotId / farmer..."
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
        />

        <Select
          placeholder="All crops"
          value={filters.crop}
          onChange={(e) => setFilters((p) => ({ ...p, crop: e.target.value }))}
        >
          {uniqueCrops.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>

        <Select
          placeholder="All hubs"
          value={filters.hubId}
          onChange={(e) => setFilters((p) => ({ ...p, hubId: e.target.value }))}
        >
          {hubs.map((h) => (
            <option key={h._id} value={h._id}>
              {h.name} ({h.location})
            </option>
          ))}
        </Select>

        <Select
          placeholder="All grades"
          value={filters.grade}
          onChange={(e) => setFilters((p) => ({ ...p, grade: e.target.value }))}
        >
          {["A", "B", "C"].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </Select>
      </SimpleGrid>

      <Box mt={4}>
        <Button onClick={fetchData} variant="outline" colorScheme="green">
          Refresh
        </Button>
      </Box>

      <SimpleGrid mt={8} columns={{ base: 1, md: 3 }} spacing={6}>
        {loading
          ? [...Array(6)].map((_, i) => (
              <Card key={i} border="1px solid" borderColor="gray.200">
                <CardBody>
                  <Skeleton height="18px" />
                  <Skeleton mt={3} height="14px" />
                  <Skeleton mt={3} height="14px" />
                </CardBody>
              </Card>
            ))
          : filteredLots.length === 0
          ? (
            <Box>
              <Text color="gray.500">No listed lots found.</Text>
              <Text mt={1} color="gray.500" fontSize="sm">
                Create a booking, then set lot status to LISTED in Dashboard to show it here.
              </Text>
            </Box>
          )
          : filteredLots.map((lot) => {
              const lotHubId = typeof lot.hubId === "object" ? lot.hubId?._id : lot.hubId;
              const hub = hubMap.get(lotHubId) || (typeof lot.hubId === "object" ? lot.hubId : null);

              return (
                <Card key={lot._id} border="1px solid" borderColor="gray.200">
                  <CardBody>
                    <Heading size="md">{lot.crop}</Heading>

                    <Text mt={2} fontSize="sm" color="gray.600">
                      Lot: <b>{lot.lotId}</b>
                    </Text>

                    <Text fontSize="sm" color="gray.600">
                      Hub: <b>{hub ? hub.name : "Unknown"}</b>
                    </Text>

                    <Text fontSize="sm" color="gray.600">
                      Available: <b>{lot.qtyKg} kg</b>
                    </Text>

                    <Text mt={2} fontSize="lg" fontWeight="bold" color="green.700">
                      ₹{lot.expectedPrice}/kg
                    </Text>

                    <Box mt={3}>
                      <Badge colorScheme={statusColor(lot.status)}>{lot.status}</Badge>
                      {lot.grade && <Badge colorScheme="purple">Grade {lot.grade}</Badge>}
                    </Box>

                    <Button
                      mt={4}
                      width="100%"
                      as={RouterLink}
                      to={`/market/${lot._id}`}
                      colorScheme="green"
                    >
                      View Details
                    </Button>

                    <Input
                      mt={3}
                      type="number"
                      min={1}
                      max={Number(lot.qtyKg)}
                      value={qtyById[lot._id] ?? 1}
                      onChange={(e) =>
                        setQtyById((prev) => ({
                          ...prev,
                          [lot._id]: Number(e.target.value)
                        }))
                      }
                    />

                    <Button
                      mt={2}
                      width="100%"
                      variant="outline"
                      colorScheme="green"
                      onClick={() => handleAdd(lot)}
                    >
                      Add to Cart
                    </Button>

                    <Button
                      mt={2}
                      width="100%"
                      as={RouterLink}
                      to={user ? "/checkout" : "/login"}
                      colorScheme="green"
                    >
                      {user ? "Checkout" : "Login to Checkout"}
                    </Button>
                  </CardBody>
                </Card>
              );
            })}
      </SimpleGrid>
    </Container>
  );
}
