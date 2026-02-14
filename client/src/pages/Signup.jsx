import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  Stack,
  Text,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("consumer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) i18n.changeLanguage(saved);
  }, [i18n]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password || (!email && !phone)) {
      setError(t("requiredAuth"));
      return;
    }

    try {
      setLoading(true);
      const user = await register({ name, email, phone, password, role });
      const fallback =
        user?.role === "farmer"
          ? "/booking"
          : user?.role === "operator" || user?.role === "admin"
          ? "/dashboard"
          : "/market";
      const target = location.state?.from || fallback;
      navigate(target);
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Container maxW="lg" py={12}>
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <HStack justify="space-between" align="start">
              <Box>
                <Heading size="lg">{t("signupTitle")}</Heading>
                <Text mt={2} color="gray.600">
                  {t("signupSubtitle")}
                </Text>
              </Box>
              <Select
                maxW="170px"
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

            <Stack as="form" onSubmit={handleSubmit} spacing={4} mt={6}>
              {error ? (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}

              <FormControl>
                <FormLabel>{t("nameLabel")}</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>{t("emailOptional")}</FormLabel>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>{t("phoneOptional")}</FormLabel>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>{t("password")}</FormLabel>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>{t("roleLabel")}</FormLabel>
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="consumer">{t("consumer")}</option>
                  <option value="farmer">{t("farmer")}</option>
                  <option value="operator">{t("operator")}</option>
                  <option value="admin">{t("admin")}</option>
                </Select>
              </FormControl>

              <Button type="submit" colorScheme="green" isLoading={loading}>
                {t("signUp")}
              </Button>

              <Text fontSize="sm" color="gray.600">
                {t("haveAccount")}{" "}
                <Text as={RouterLink} to="/login" color="green.700" fontWeight={600}>
                  {t("loginLink")}
                </Text>
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
