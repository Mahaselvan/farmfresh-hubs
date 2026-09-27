import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast
} from "@chakra-ui/react";
import { api } from "../api/endpoints";

const LOT_STATUS = ["RECEIVED", "STORED", "LISTED", "PARTIALLY_SOLD", "SOLD", "SETTLED"];

const statusColor = (status) => ({ RECEIVED: "gray", STORED: "blue", LISTED: "green", PARTIALLY_SOLD: "orange", SOLD: "red", SETTLED: "purple" }[status] || "gray");

export default function Dashboard() {
  const toast = useToast();
  const [lots, setLots] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [filters, setFilters] = useState({ status: "", crop: "", hubId: "", grade: "", q: "" });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [lotsRes, hubsRes] = await Promise.all([api.getLots(), api.getHubs()]);
        setLots(lotsRes.data.data || []);
        setHubs(hubsRes.data.data || []);
      } catch (err) {
        toast({ title: "Failed to load dashboard", description: err?.response?.data?.message || err.message, status: "error" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const cards = useMemo(() => ({
    total: lots.length,
    stored: lots.filter((l) => l.status === "STORED").length,
    listed: lots.filter((l) => l.status === "LISTED").length,
    sold: lots.filter((l) => ["SOLD", "PARTIALLY_SOLD"].includes(l.status)).length,
    pendingSettlement: lots.filter((l) => l.status === "SOLD").length
  }), [lots]);

  const filtered = useMemo(() => lots.filter((l) => {
    if (filters.status && l.status !== filters.status) return false;
    if (filters.crop && !String(l.crop || "").toLowerCase().includes(filters.crop.toLowerCase())) return false;
    if (filters.grade && l.grade !== filters.grade) return false;
    if (filters.hubId && String(l.hubId?._id || l.hubId) !== String(filters.hubId)) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (![l.lotId, l.crop, l.farmerName].some((v) => String(v || "").toLowerCase().includes(q))) return false;
    }
    return true;
  }), [lots, filters]);

  const saveLot = async (lot) => {
    try {
      setSavingId(lot._id);
      const payload = {
        status: lot.status,
        grade: lot.grade,
        finalWeightKg: lot.finalWeightKg === "" ? null : Number(lot.finalWeightKg || 0),
        temp: lot.temp === "" ? null : Number(lot.temp || 0),
        humidity: lot.humidity === "" ? null : Number(lot.humidity || 0),
        packingNotes: lot.packingNotes || ""
      };
      const res = await api.updateLot(lot._id, payload);
      setLots((prev) => prev.map((x) => (x._id === lot._id ? res.data.data : x)));
      toast({ title: "Lot updated", status: "success" });
    } catch (err) {
      toast({ title: "Update failed", description: err?.response?.data?.message || err.message, status: "error" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Container maxW="7xl" py={8}>
      <Heading color="green.700">Operator Dashboard</Heading>

      <SimpleGrid mt={5} columns={{ base: 2, md: 5 }} spacing={3}>
        <Card><CardBody><Text>Total Lots</Text><Heading size="md">{cards.total}</Heading></CardBody></Card>
        <Card><CardBody><Text>Stored</Text><Heading size="md">{cards.stored}</Heading></CardBody></Card>
        <Card><CardBody><Text>Listed</Text><Heading size="md">{cards.listed}</Heading></CardBody></Card>
        <Card><CardBody><Text>Sold</Text><Heading size="md">{cards.sold}</Heading></CardBody></Card>
        <Card><CardBody><Text>Pending Settlement</Text><Heading size="md">{cards.pendingSettlement}</Heading></CardBody></Card>
      </SimpleGrid>

      <SimpleGrid mt={6} columns={{ base: 1, md: 5 }} spacing={3}>
        <FormControl><FormLabel>Search lots</FormLabel><Input value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} /></FormControl>
        <FormControl><FormLabel>Status</FormLabel><Select placeholder="All" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>{LOT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></FormControl>
        <FormControl><FormLabel>Crop</FormLabel><Input value={filters.crop} onChange={(e) => setFilters((p) => ({ ...p, crop: e.target.value }))} /></FormControl>
        <FormControl><FormLabel>Hub</FormLabel><Select placeholder="All" value={filters.hubId} onChange={(e) => setFilters((p) => ({ ...p, hubId: e.target.value }))}>{hubs.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}</Select></FormControl>
        <FormControl><FormLabel>Grade</FormLabel><Select placeholder="All" value={filters.grade} onChange={(e) => setFilters((p) => ({ ...p, grade: e.target.value }))}>{["A", "B", "C"].map((g) => <option key={g} value={g}>{g}</option>)}</Select></FormControl>
      </SimpleGrid>

      <Box mt={6} overflowX="auto" borderWidth="1px" borderRadius="md">
        <Table size="sm" minW="980px">
          <Thead><Tr><Th>Lot ID</Th><Th>Crop</Th><Th>Farmer</Th><Th isNumeric>Quantity</Th><Th>Status</Th><Th>Grade</Th><Th>Hub</Th><Th>Actions</Th></Tr></Thead>
          <Tbody>
            {!loading && filtered.map((lot) => (
              <Tr key={lot._id}>
                <Td>{lot.lotId}</Td>
                <Td>{lot.crop}</Td>
                <Td>{lot.farmerName}</Td>
                <Td isNumeric>{lot.qtyKg}</Td>
                <Td>
                  <Badge colorScheme={statusColor(lot.status)}>{lot.status}</Badge>
                  <Select mt={2} size="xs" value={lot.status} onChange={(e) => setLots((prev) => prev.map((x) => x._id === lot._id ? { ...x, status: e.target.value } : x))}>{LOT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
                </Td>
                <Td><Select size="xs" value={lot.grade || ""} onChange={(e) => setLots((prev) => prev.map((x) => x._id === lot._id ? { ...x, grade: e.target.value } : x))} placeholder="-">{["A", "B", "C"].map((g) => <option key={g} value={g}>{g}</option>)}</Select></Td>
                <Td>{lot.hubId?.name || "-"}</Td>
                <Td><Button size="xs" isLoading={savingId === lot._id} onClick={() => saveLot(lot)}>Save Lot</Button></Td>
              </Tr>
            ))}
            {!loading && filtered.length === 0 ? <Tr><Td colSpan={8}><Text py={5} textAlign="center">No lots found.</Text></Td></Tr> : null}
          </Tbody>
        </Table>
      </Box>
    </Container>
  );
}
