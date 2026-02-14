import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Heading,
  HStack,
  Select,
  SimpleGrid,
  Text
} from "@chakra-ui/react";
import { useSearchParams, Link as RouterLink } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const ROLES = [
  { key: "consumer", label: "Consumer" },
  { key: "farmer", label: "Farmer" },
  { key: "admin", label: "Admin" }
];

export default function AuthRoleSelect() {
  const [params] = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "login";
  const { t, i18n } = useTranslation();

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) i18n.changeLanguage(saved);
  }, [i18n]);

  return (
    <Box>
      <Container maxW="lg" py={12}>
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <HStack justify="space-between" align="start">
              <Box>
                <Heading size="lg">{t("roleSelectTitle")}</Heading>
                <Text mt={2} color="gray.600">
                  {t("roleSelectSubtitle")}{" "}
                  {mode === "signup" ? t("modeSignup") : t("modeLogin")}.
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

            <SimpleGrid mt={6} columns={{ base: 1, md: 3 }} spacing={4}>
              {ROLES.map((r) => (
                <Button
                  key={r.key}
                  as={RouterLink}
                  to={`/${mode}?role=${r.key}`}
                  colorScheme="green"
                  variant={r.key === "farmer" ? "solid" : "outline"}
                >
                  {t(r.key)}
                </Button>
              ))}
            </SimpleGrid>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
