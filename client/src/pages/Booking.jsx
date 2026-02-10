import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Text,
  useToast,
  Card,
  CardBody,
  Badge,
  Divider,
  HStack,
  Spacer
} from "@chakra-ui/react";
import { api } from "../api/endpoints";
import { useTranslation } from "react-i18next";

export default function Booking() {
  const toast = useToast();
  const { t, i18n } = useTranslation();

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  const [hubs, setHubs] = useState([]);
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    farmerName: "",
    phone: "",
    village: "",
    crop: "",
    qtyKg: "",
    expectedPrice: "",
    hubId: "",
    storageDays: "1"
  });

  const [createdLot, setCreatedLot] = useState(null);


  const fetchHubs = async () => {
    try {
      setLoadingHubs(true);
      const res = await api.getHubs();
      setHubs(res.data.data || []);
    } catch (err) {
      toast({
        title: t("failed"),
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setLoadingHubs(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) i18n.changeLanguage(saved);
  }, [i18n]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validate = () => {
    if (!form.farmerName.trim()) return `${t("farmerName")} ${t("required")}`;
    if (!form.phone.trim()) return `${t("phone")} ${t("required")}`;
    if (form.phone.trim().length < 10) return t("phoneMin");
    if (!form.village.trim()) return `${t("village")} ${t("required")}`;
    if (!form.crop.trim()) return `${t("crop")} ${t("required")}`;
    if (!form.qtyKg || Number(form.qtyKg) <= 0) return t("qtyInvalid");
    if (!form.expectedPrice || Number(form.expectedPrice) <= 0) return t("priceInvalid");
    if (!form.hubId) return t("hubRequired");
    if (!form.storageDays) return t("storageRequired");
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast({
        title: t("validationError"),
        remember: false,
        description: error,
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setSubmitting(true);
      setCreatedLot(null);

      const payload = {
        farmerName: form.farmerName,
        phone: form.phone,
        village: form.village,
        crop: form.crop,
        qtyKg: Number(form.qtyKg),
        expectedPrice: Number(form.expectedPrice),
        hubId: form.hubId,
        storageDays: Number(form.storageDays)
      };

      const res = await api.createLot(payload);
      setCreatedLot(res.data.data);
      window.dispatchEvent(new Event("lot:created"));
      toast({
        title: t("success"),
        description: `${t("lotCreated")}: ${res.data.data.lotId}`,
        status: "success",
        duration: 4000,
        isClosable: true
      });
      window.dispatchEvent(new Event("lot:created"));
      setForm({
        farmerName: "",
        phone: "",
        village: "",
        crop: "",
        qtyKg: "",
        expectedPrice: "",
        hubId: "",
        storageDays: "1"
      });
    } catch (err) {
      toast({
        title: t("failed"),
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 4000,
        isClosable: true
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxW="6xl" py={10}>
      <HStack>
        <Box>
          <Heading color="green.700">{t("bookingTitle")}</Heading>
          <Text mt={2} color="gray.600">
            {t("bookingSubtitle")}
          </Text>
        </Box>

        <Spacer />

        <Select
          maxW="220px"
          value={i18n.language}
          onChange={(e) => changeLang(e.target.value)}
        >
          <option value="en">English</option>
          <option value="ta">தமிழ்</option>
          <option value="te">తెలుగు</option>
          <option value="hi">हिंदी</option>
          <option value="ml">മലയാളം</option>
        </Select>
      </HStack>

      <SimpleGrid mt={8} columns={{ base: 1, md: 2 }} spacing={6}>
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <Heading size="md">{t("bookingForm")}</Heading>

            <Box as="form" mt={4} onSubmit={handleSubmit}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t("farmerName")}</FormLabel>
                  <Input
                    name="farmerName"
                    value={form.farmerName}
                    onChange={handleChange}
                    placeholder="Mahaselvan"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>{t("phone")}</FormLabel>
                  <Input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="9000000000"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>{t("village")}</FormLabel>
                  <Input
                    name="village"
                    value={form.village}
                    onChange={handleChange}
                    placeholder="Navalur"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>{t("crop")}</FormLabel>
                  <Input
                    name="crop"
                    value={form.crop}
                    onChange={handleChange}
                    placeholder="Tomato"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>{t("qtyKg")}</FormLabel>
                  <Input
                    type="number"
                    name="qtyKg"
                    value={form.qtyKg}
                    onChange={handleChange}
                    placeholder="100"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>{t("expectedPrice")}</FormLabel>
                  <Input
                    type="number"
                    name="expectedPrice"
                    value={form.expectedPrice}
                    onChange={handleChange}
                    placeholder="30"
                  />
                </FormControl>

                <FormControl isRequired>
  <FormLabel>{t("hub")}</FormLabel>

  <Select
    name="hubId"
    value={form.hubId}
    onChange={handleChange}
    isDisabled={loadingHubs}
  >
    {/* REAL placeholder option */}
    <option value="">
      {loadingHubs ? t("loadingHubs") : t("chooseHub")}
    </option>

    {/* REAL data options */}
    {hubs.map((hub) => (
      <option key={hub._id} value={hub._id}>
        {hub.name} ({hub.location})
      </option>
    ))}
  </Select>
</FormControl>

                <FormControl isRequired>
                  <FormLabel>{t("storageDays")}</FormLabel>
                  <Select
                    name="storageDays"
                    value={form.storageDays}
                    onChange={handleChange}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        {d} {t("days")}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>

              <Button
                mt={6}
                type="submit"
                colorScheme="green"
                width="100%"
                isLoading={submitting}
              >
                {t("submit")}
              </Button>
            </Box>
          </CardBody>
        </Card>

        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <Heading size="md">{t("generatedLotDetails")}</Heading>
            <Text mt={2} color="gray.600">
              {t("afterBooking")}
            </Text>

            <Divider my={4} />

            {!createdLot ? (
              <Text color="gray.500">{t("noBookingYet")}</Text>
            ) : (
              <Box>
                <Text>
                  <b>{t("lotId")}:</b>{" "}
                  <Badge colorScheme="green" fontSize="md">
                    {createdLot.lotId}
                  </Badge>
                </Text>

                <Text mt={3}>
                  <b>{t("status")}:</b>{" "}
                  <Badge colorScheme="purple">{createdLot.status}</Badge>
                </Text>

                <Text mt={3}>
                  <b>{t("qrString")}:</b>
                </Text>

                <Box
                  mt={2}
                  p={3}
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  fontSize="sm"
                  fontFamily="mono"
                >
                  {createdLot.qrString}
                </Box>
                
                <Text mt={4} color="gray.600" fontSize="sm">
                  {t("qrNote")}
                </Text>
                <Box
  mt={2}
  p={3}
  bg="gray.50"
  border="1px solid"
  borderColor="gray.200"
  borderRadius="md"
  fontSize="sm"
  fontFamily="mono"
>
  {createdLot.qrString}
</Box>
<Button
  size="sm"
  mt={2}
  variant="outline"
  colorScheme="blue"
  as={RouterLink}
  to={`/trace/${createdLot._id}`}
>
  Trace
</Button>

<Button
  mt={4}
  as={RouterLink}
  to={`/qr/${createdLot._id}`}
  colorScheme="green"
  width="100%"
>
  View QR Slip
</Button>

<Button
  mt={2}
  as={RouterLink}
  to={`/trace/${createdLot._id}`}
  variant="outline"
  colorScheme="green"
  width="100%"
>
  View Traceability
</Button>

              </Box>
              
            )}
          </CardBody>
        </Card>
      </SimpleGrid>
    </Container>
  );
}



