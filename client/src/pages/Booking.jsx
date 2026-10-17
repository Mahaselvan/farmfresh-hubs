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
  Grid,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  useToast
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const CROPS = ["Tomato", "Onion", "Potato", "Mango", "Banana", "Other"];
const MAX_QTY = 50000;

export default function Booking() {
  const toast = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [hubs, setHubs] = useState([]);
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    crop: "",
    otherCrop: "",
    qtyKg: 100,
    village: "",
    storageDays: 1,
    expectedPrice: 30,
    hubId: ""
  });

  const [createdLot, setCreatedLot] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingHubs(true);
        const res = await api.getHubs();
        setHubs(res.data.data || []);
      } catch (err) {
        toast({ title: "Failed to load hubs", description: err?.response?.data?.message || err.message, status: "error" });
      } finally {
        setLoadingHubs(false);
      }
    };
    load();
  }, [toast]);

  const selectedHub = useMemo(() => hubs.find((h) => h._id === form.hubId), [hubs, form.hubId]);

  const availableKg = useMemo(() => {
    if (!selectedHub) return null;
    return Number(selectedHub.availableKg ?? (Number(selectedHub.capacityKg || 0) - Number(selectedHub.reservedKg || 0) - Number(selectedHub.storedKg || 0)));
  }, [selectedHub]);

  const cropValue = form.crop === "Other" ? form.otherCrop.trim() : form.crop;
  const estimatedValue = Number(form.qtyKg || 0) * Number(form.expectedPrice || 0);

  const canGoNext = () => {
    if (step === 1) return Boolean(cropValue);
    if (step === 2) return Number(form.qtyKg) > 0 && Number(form.qtyKg) <= MAX_QTY && (availableKg == null || Number(form.qtyKg) <= availableKg);
    if (step === 3) return Boolean(form.village.trim());
    if (step === 4) return Number(form.storageDays) >= 1 && Number(form.storageDays) <= 7;
    if (step === 5) return Number(form.expectedPrice) > 0;
    if (step === 6) return Boolean(form.hubId);
    return true;
  };

  const next = () => {
    if (!canGoNext()) {
      toast({ title: "Please complete this step", status: "warning" });
      return;
    }
    setStep((s) => Math.min(7, s + 1));
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    if (!user) return;

    try {
      setSubmitting(true);
      const payload = {
        crop: cropValue,
        qtyKg: Number(form.qtyKg),
        village: form.village.trim(),
        expectedPrice: Number(form.expectedPrice),
        hubId: form.hubId,
        storageDays: Number(form.storageDays)
      };
      const res = await api.createLot(payload);
      setCreatedLot(res.data.data);
      setStep(8);
      toast({ title: "Your storage booking is confirmed.", status: "success" });
    } catch (err) {
      toast({ title: "Booking failed", description: err?.response?.data?.message || err.message, status: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const QuantityStep = (
    <Stack spacing={4}>
      <Heading size="md">How much produce do you have?</Heading>
      <HStack>
        <Button minW="44px" onClick={() => setForm((p) => ({ ...p, qtyKg: Math.max(1, Number(p.qtyKg || 0) - 1) }))}>-</Button>
        <Input type="number" value={form.qtyKg} onChange={(e) => setForm((p) => ({ ...p, qtyKg: Number(e.target.value) }))} />
        <Button minW="44px" onClick={() => setForm((p) => ({ ...p, qtyKg: Number(p.qtyKg || 0) + 1 }))}>+</Button>
      </HStack>
      <Text>{Number(form.qtyKg || 0)} kg</Text>
      {availableKg != null ? (
        <Box>
          <Text>Available storage: {availableKg} kg</Text>
          <Text>Your booking: {Number(form.qtyKg || 0)} kg</Text>
          {Number(form.qtyKg || 0) > availableKg ? (
            <Text color="red.600">Not enough space available</Text>
          ) : null}
        </Box>
      ) : (
        <Text color="gray.500">Select a hub in Step 6 to see available storage.</Text>
      )}
    </Stack>
  );

  return (
    <Container maxW="3xl" py={6}>
      <Heading size="lg" color="green.700">Book Storage</Heading>
      <Text mt={2} color="gray.600">Tell us what you have → how much → where → review → confirm.</Text>
      <Text mt={2} fontSize="sm">Step {step} of 8</Text>

      <Card mt={5}>
        <CardBody>
          {step === 1 && (
            <Stack spacing={4}>
              <Heading size="md">What are you bringing?</Heading>
              <Grid templateColumns={{ base: "repeat(2,1fr)", md: "repeat(3,1fr)" }} gap={3}>
                {CROPS.map((crop) => (
                  <Button
                    key={crop}
                    h="56px"
                    variant={form.crop === crop ? "solid" : "outline"}
                    colorScheme="green"
                    onClick={() => setForm((p) => ({ ...p, crop }))}
                  >
                    {crop}
                  </Button>
                ))}
              </Grid>
              {form.crop === "Other" ? (
                <FormControl>
                  <FormLabel>Other crop</FormLabel>
                  <Input value={form.otherCrop} onChange={(e) => setForm((p) => ({ ...p, otherCrop: e.target.value }))} />
                </FormControl>
              ) : null}
            </Stack>
          )}

          {step === 2 && QuantityStep}

          {step === 3 && (
            <Stack spacing={4}>
              <Heading size="md">Which village are you from?</Heading>
              <Input value={form.village} onChange={(e) => setForm((p) => ({ ...p, village: e.target.value }))} placeholder="Your village" />
              <Text fontSize="sm" color="gray.600">Name and phone come from your account.</Text>
            </Stack>
          )}

          {step === 4 && (
            <Stack spacing={4}>
              <Heading size="md">How many days do you need storage?</Heading>
              <SimpleGrid columns={{ base: 4, md: 7 }} spacing={2}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <Button key={day} h="48px" variant={Number(form.storageDays) === day ? "solid" : "outline"} colorScheme="green" onClick={() => setForm((p) => ({ ...p, storageDays: day }))}>{day} day</Button>
                ))}
              </SimpleGrid>
              <Text fontSize="sm" color="gray.600">Storage duration: maximum 7 days</Text>
            </Stack>
          )}

          {step === 5 && (
            <Stack spacing={4}>
              <Heading size="md">What price do you expect?</Heading>
              <HStack>
                <Text>₹</Text>
                <Input type="number" value={form.expectedPrice} onChange={(e) => setForm((p) => ({ ...p, expectedPrice: Number(e.target.value) }))} />
                <Text>per kg</Text>
              </HStack>
              <Text>Estimated value: {Number(form.qtyKg || 0)} kg × ₹{Number(form.expectedPrice || 0)}/kg = ₹{estimatedValue}</Text>
            </Stack>
          )}

          {step === 6 && (
            <Stack spacing={4}>
              <Heading size="md">Select Hub</Heading>
              {loadingHubs ? <Text>Loading hubs...</Text> : (
                <Stack spacing={3}>
                  {hubs.map((hub) => {
                    const hubAvailable = Number(hub.availableKg ?? (Number(hub.capacityKg || 0) - Number(hub.reservedKg || 0) - Number(hub.storedKg || 0)));
                    return (
                      <Card key={hub._id} borderWidth="1px" borderColor={form.hubId === hub._id ? "green.400" : "gray.200"}>
                        <CardBody>
                          <Text fontWeight="700">{hub.name}</Text>
                          <Text fontSize="sm">{hub.location}</Text>
                          <Text mt={2}>Available capacity: {hubAvailable} kg</Text>
                          <Badge mt={2} colorScheme="green">Open</Badge>
                          <Button mt={3} h="44px" width="100%" colorScheme="green" variant={form.hubId === hub._id ? "solid" : "outline"} onClick={() => setForm((p) => ({ ...p, hubId: hub._id }))}>Select this hub</Button>
                        </CardBody>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          )}

          {step === 7 && (
            <Stack spacing={3}>
              <Heading size="md">Your Booking</Heading>
              <Text><b>Crop:</b> {cropValue}</Text>
              <Text><b>Quantity:</b> {form.qtyKg} kg</Text>
              <Text><b>Village:</b> {form.village}</Text>
              <Text><b>Storage:</b> {form.storageDays} days</Text>
              <Text><b>Your expected price:</b> ₹{form.expectedPrice}/kg</Text>
              <Text><b>Estimated value:</b> ₹{estimatedValue}</Text>
              <Text><b>Hub:</b> {selectedHub?.name || "-"}</Text>
            </Stack>
          )}

          {step === 8 && createdLot && (
            <Stack spacing={3}>
              <Heading size="md" color="green.700">Booking confirmed!</Heading>
              <Text><b>Lot ID:</b> {createdLot.lotId}</Text>
              <Text><b>Crop:</b> {createdLot.crop}</Text>
              <Text><b>Quantity:</b> {createdLot.qtyKg} kg</Text>
              <Text><b>Hub:</b> {selectedHub?.name || "FarmFresh Hub"}</Text>
              <Text><b>Status:</b> {createdLot.status}</Text>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={2}>
                <Button as={RouterLink} to={`/qr/${createdLot._id}`} colorScheme="green">Show QR Slip</Button>
                <Button as={RouterLink} to="/farmer" variant="outline" colorScheme="green">View My Produce</Button>
                <Button onClick={() => {
                  setStep(1);
                  setCreatedLot(null);
                  setForm({ crop: "", otherCrop: "", qtyKg: 100, village: "", storageDays: 1, expectedPrice: 30, hubId: "" });
                }}>Book Another Lot</Button>
              </SimpleGrid>
            </Stack>
          )}

          {step < 8 ? (
            <HStack mt={6}>
              <Button onClick={back} isDisabled={step === 1}>Go Back</Button>
              {step < 7 ? (
                <Button ml="auto" colorScheme="green" onClick={next} isDisabled={!canGoNext()} h="44px">Next</Button>
              ) : (
                <Button ml="auto" colorScheme="green" onClick={submit} isLoading={submitting} h="44px">Confirm Booking</Button>
              )}
            </HStack>
          ) : null}
        </CardBody>
      </Card>
    </Container>
  );
}
