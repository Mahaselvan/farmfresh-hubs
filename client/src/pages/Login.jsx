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
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const role = params.get("role");

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) i18n.changeLanguage(saved);
  }, [i18n]);

  useEffect(() => {
    if (!role) {
      navigate("/auth?mode=login", { replace: true });
    }
  }, [role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password || (!email && !phone)) {
      setError(t("requiredAuth"));
      return;
    }

    try {
      setLoading(true);
      const user = await login({ email, phone, password });
      const fallback =
        user?.role === "farmer"
          ? "/booking"
          : user?.role === "operator" || user?.role === "admin"
          ? "/dashboard"
          : "/market";
      const target = location.state?.from || fallback;
      navigate(target);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed.");
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
                <Heading size="lg">{t("loginTitle")}</Heading>
                <Text mt={2} color="gray.600">
                  {t("loginSubtitle")}
                </Text>
                <Text mt={1} fontSize="sm" color="gray.500">
                  Role: {role || "-"}
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

              <Button type="submit" colorScheme="green" isLoading={loading}>
                {t("signIn")}
              </Button>

              <Text fontSize="sm" color="gray.600">
                {t("noAccount")}{" "}
                <Text as={RouterLink} to="/signup" color="green.700" fontWeight={600}>
                  {t("createAccount")}
                </Text>
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
