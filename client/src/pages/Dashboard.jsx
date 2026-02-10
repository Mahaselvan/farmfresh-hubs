import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Skeleton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  useToast,
  Card,
  CardBody
} from "@chakra-ui/react";
import { api } from "../api/endpoints";
import { Link as RouterLink } from "react-router-dom";

const STATUS_FLOW = ["RECEIVED", "STORED", "LISTED", "SOLD", "SETTLED"];

function statusColor(status) {
  switch (status) {
    case "RECEIVED": return "blue";
    case "STORED": return "purple";
    case "LISTED": return "green";
    case "SOLD": return "orange";
    case "SETTLED": return "gray";
    default: return "gray";
  }
}

export default function Dashboard() {
  const toast = useToast();

  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const [filters, setFilters] = useState({
    crop: "",
    status: "",
    hubId: ""
  });

  const fetchLots = async () => {
    try {
      setLoading(true);
      const res = await api.getLots();
      setLots(res.data.data || []);
    } catch (err) {
      toast({
        title: "Failed to load lots",
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHubs = async () => {
    try {
      const res = await api.getHubs();
      return res.data.data || [];
    } catch {
      return [];
    }
  };

  const [hubs, setHubs] = useState([]);
useEffect(() => {
  fetchLots();

  const onFocus = () => fetchLots();
  const onLotCreated = () => fetchLots();

  window.addEventListener("focus", onFocus);
  window.addEventListener("lot:created", onLotCreated);

  return () => {
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("lot:created", onLotCreated);
  };
}, []);



  const hubMap = useMemo(() => {
    const m = new Map();
    hubs.forEach((h) => m.set(h._id, h));
    return m;
  }, [hubs]);

  const uniqueCrops = useMemo(() => {
    const s = new Set(lots.map((l) => (l.crop || "").trim()).filter(Boolean));
    return Array.from(s).sort();
  }, [lots]);

  const filteredLots = useMemo(() => {
    return lots.filter((l) => {
      if (filters.crop && l.crop !== filters.crop) return false;
      if (filters.status && l.status !== filters.status) return false;
      if (filters.hubId && String(l.hubId) !== String(filters.hubId) && String(l.hub?._id) !== String(filters.hubId)) return false;
      return true;
    });
  }, [lots, filters]);

  const isAlert = (lot) => {
    // Demo safe range: temp 2-8, humidity 60-85
    const t = Number(lot.temp);
    const h = Number(lot.humidity);
    const tBad = Number.isFinite(t) && (t < 2 || t > 8);
    const hBad = Number.isFinite(h) && (h < 60 || h > 85);
    return tBad || hBad;
  };

  const updateLot = async (lotId, payload) => {
    try {
      setSavingId(lotId);
      const res = await api.updateLot(lotId, payload);
      const updated = res.data.data;
      setLots((prev) => prev.map((l) => (l._id === lotId ? updated : l)));

      toast({
        title: "Updated ✅",
        description: `Lot ${updated.lotId} updated`,
        status: "success",
        duration: 2500,
        isClosable: true
      });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 3500,
        isClosable: true
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleInlineChange = (lotId, field, value) => {
    setLots((prev) =>
      prev.map((l) => (l._id === lotId ? { ...l, [field]: value } : l))
    );
  };

  return (
    <Container maxW="7xl" py={10}>
      <Heading color="green.700">Hub Operator Dashboard</Heading>
      <Text mt={2} color="gray.600">
        Public demo view — update lot status, grading, chamber values, and see alerts.
      </Text>

      <Card mt={6} border="1px solid" borderColor="gray.200">
        <CardBody>
          <Heading size="sm">Filters</Heading>
          <SimpleGrid mt={3} columns={{ base: 1, md: 3 }} spacing={4}>
            <FormControl>
              <FormLabel>Crop</FormLabel>
              <Select
                value={filters.crop}
                onChange={(e) => setFilters((p) => ({ ...p, crop: e.target.value }))}
                placeholder="All crops"
              >
                {uniqueCrops.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                placeholder="All statuses"
              >
                {STATUS_FLOW.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Hub</FormLabel>
              <Select
                value={filters.hubId}
                onChange={(e) => setFilters((p) => ({ ...p, hubId: e.target.value }))}
                placeholder="All hubs"
              >
                {hubs.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.location})
                  </option>
                ))}
              </Select>
            </FormControl>
          </SimpleGrid>

          <HStack mt={4}>
            <Button onClick={fetchLots} colorScheme="green" variant="outline">
              Refresh
            </Button>
            <Button
              onClick={() => setFilters({ crop: "", status: "", hubId: "" })}
              variant="ghost"
            >
              Clear
            </Button>
          </HStack>
        </CardBody>
      </Card>

      <Divider my={6} />

     <Box
  border="1px solid"
  borderColor="gray.200"
  borderRadius="md"
  overflowX="auto"
  overflowY="hidden"
  bg="white"
>
  <Box minW="1100px">
        <Table size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th>Lot</Th>
              <Th>Farmer</Th>
              <Th>Crop</Th>
              <Th isNumeric>Qty (kg)</Th>
              <Th>Status</Th>
              <Th>Grade</Th>
              <Th isNumeric>Final Wt</Th>
              <Th>Temp</Th>
              <Th>Humidity</Th>
              <Th>Notes</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <Tr key={i}>
                  {Array.from({ length: 11 }).map((__, j) => (
                    <Td key={j}><Skeleton height="18px" /></Td>
                  ))}
                </Tr>
              ))
            ) : filteredLots.length === 0 ? (
              <Tr>
                <Td colSpan={11}>
                  <Text py={6} textAlign="center" color="gray.500">
                    No lots found.
                  </Text>
                </Td>
              </Tr>
            ) : (
              filteredLots.map((lot) => {
                const hub = hubMap.get(lot.hubId) || lot.hub;
                const alert = isAlert(lot);

                return (
                  <Tr key={lot._id}>
                    <Td>
                      <Text fontWeight="bold">{lot.lotId}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {hub ? `${hub.name}` : "Unknown hub"}
                      </Text>
                      {alert && (
                        <Badge mt={1} colorScheme="red">
                          ALERT
                        </Badge>
                      )}
                    </Td>

                    <Td>
                      <Text>{lot.farmerName}</Text>
                      <Text fontSize="xs" color="gray.500">{lot.phone}</Text>
                    </Td>

                    <Td>{lot.crop}</Td>

                    <Td isNumeric>{lot.qtyKg}</Td>

                    <Td>
                      <Badge colorScheme={statusColor(lot.status)}>{lot.status}</Badge>
                      <Select
                        mt={2}
                        size="xs"
                        value={lot.status}
                        onChange={(e) => handleInlineChange(lot._id, "status", e.target.value)}
                      >
                        {STATUS_FLOW.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </Td>

                    <Td>
                      <Select
                        size="sm"
                        value={lot.grade || ""}
                        onChange={(e) => handleInlineChange(lot._id, "grade", e.target.value)}
                        placeholder="—"
                      >
                        {["A", "B", "C"].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </Select>
                    </Td>

                    <Td isNumeric>
                      <Input
                        size="sm"
                        type="number"
                        value={lot.finalWeightKg ?? ""}
                       onChange={(e) => handleInlineChange(lot._id, "finalWeightKg", e.target.value)}
                        placeholder="kg"
                      />
                    </Td>

                    <Td>
                      <Input
                        size="sm"
                        type="number"
                        value={lot.temp ?? ""}
                        onChange={(e) => handleInlineChange(lot._id, "temp", e.target.value)}
                        placeholder="°C"
                      />
                    </Td>

                    <Td>
                      <Input
                        size="sm"
                        type="number"
                        value={lot.humidity ?? ""}
                        onChange={(e) => handleInlineChange(lot._id, "humidity", e.target.value)}
                        placeholder="%"
                      />
                    </Td>

                    <Td>
                      <Input
                        size="sm"
                        value={lot.packingNotes ?? ""}
                        onChange={(e) => handleInlineChange(lot._id, "packingNotes", e.target.value)}
                        placeholder="Packing notes"
                      />
                    </Td>

                    <Td>
                   <Button
    size="sm"
    colorScheme="green"
    isLoading={savingId === lot._id}
    onClick={() =>
      updateLot(lot._id, {
        status: lot.status,
        grade: lot.grade || null,
       finalWeightKg: lot.finalWeightKg === "" ? null : Number(lot.finalWeightKg),
        packingNotes: lot.packingNotes || "",
        temp: lot.temp === "" ? null : Number(lot.temp),
        humidity: lot.humidity === "" ? null : Number(lot.humidity)
      })
    }
  >
    Save
  </Button>

  <Button
    size="sm"
    mt={2}
    variant="outline"
    colorScheme="green"
    as={RouterLink}
    to={`/ledger/${lot._id}`}
  >
    View Ledger
  </Button>

  <Button
  size="sm"
  mt={2}
  variant="outline"
  colorScheme="blue"
  as={RouterLink}
  to={`/qr/${lot._id}`}
>
  QR Slip
</Button>

                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </Box>
      </Box>
    </Container>
  );
}
