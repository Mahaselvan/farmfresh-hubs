import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Icon,
  Image,
  Select,
  SimpleGrid,
  Text,
  Card,
  CardBody,
  Stack
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { BellIcon, CalendarIcon, SettingsIcon } from "@chakra-ui/icons";
import { useTranslation } from "react-i18next";
import farmerImage from "../assets/image.png";

const Feature = ({ title, desc }) => (
  <Card border="1px solid" borderColor="gray.200">
    <CardBody>
      <Heading size="md" color="brand.700">{title}</Heading>
      <Text mt={2} color="gray.600">{desc}</Text>
    </CardBody>
  </Card>
);

export default function Home() {
  const { t, i18n } = useTranslation();

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  return (
    <Box>
      <Box bg="brand.700" color="white" py={{ base: 12, md: 16 }}>
        <Container maxW="7xl">
          <Heading fontSize={{ base: "3xl", md: "5xl" }}>
            FarmFresh Hubs
          </Heading>
          <Text mt={3} fontSize={{ base: "md", md: "lg" }} opacity={0.95}>
            Smart cold storage + farmer-to-consumer marketplace (MVP demo)
          </Text>

          <Stack direction={{ base: "column", sm: "row" }} mt={8} spacing={4}>
            <Button as={RouterLink} to="/booking" colorScheme="green" size="lg">
              Farmer Booking
            </Button>
            <Button as={RouterLink} to="/market" variant="outline" colorScheme="green" size="lg">
              Browse Marketplace
            </Button>
            <Button as={RouterLink} to="/dashboard" variant="outline" colorScheme="green" size="lg">
              Operator Dashboard
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxW="7xl" py={10}>
        <Heading size="lg" color="brand.700">Choose Your Role</Heading>
        <Text mt={2} color="gray.600">
          Role-based landing (MVP). Later this will route after authentication.
        </Text>

        <SimpleGrid mt={6} columns={{ base: 1, md: 3 }} spacing={5}>
          <Card border="1px solid" borderColor="gray.200">
            <CardBody>
              <HStack justify="space-between" align="start">
                <Image src={farmerImage} alt="Farmer" boxSize="96px" />
                <Select
                  maxW="140px"
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
              <HStack spacing={3} mt={3}>
                <Icon as={CalendarIcon} color="green.600" />
                <Heading size="md">Farmer</Heading>
              </HStack>
              <Text mt={2} color="gray.600">
                Book storage, create lots, and manage your bookings.
              </Text>
              <Stack mt={4} spacing={2}>
                <Button as={RouterLink} to="/login" variant="outline" colorScheme="green">
                  {t("farmerLogin")}
                </Button>
                <Button as={RouterLink} to="/booking" colorScheme="green">
                  {t("bookingButton")}
                </Button>
                <Button as={RouterLink} to="/farmer" variant="outline" colorScheme="green">
                  Farmer Dashboard
                </Button>
              </Stack>
            </CardBody>
          </Card>

          <Card border="1px solid" borderColor="gray.200">
            <CardBody>
              <HStack spacing={3}>
                <Icon as={BellIcon} color="green.600" />
                <Heading size="md">Consumer</Heading>
              </HStack>
              <Text mt={2} color="gray.600">
                Browse the marketplace, order from cart, and track notifications.
              </Text>
              <Stack mt={4} spacing={2}>
                <Button as={RouterLink} to="/login" colorScheme="green">
                  Consumer Login
                </Button>
                <Button as={RouterLink} to="/signup" variant="outline" colorScheme="green">
                  Consumer Sign Up
                </Button>
              </Stack>
            </CardBody>
          </Card>

          <Card border="1px solid" borderColor="gray.200">
            <CardBody>
              <HStack spacing={3}>
                <Icon as={SettingsIcon} color="green.600" />
                <Heading size="md">Hub Operator</Heading>
              </HStack>
              <Text mt={2} color="gray.600">
                Manage hub operations, alerts, and system notifications.
              </Text>
              <Stack mt={4} spacing={2}>
                <Button as={RouterLink} to="/dashboard" colorScheme="green">
                  Operator Dashboard
                </Button>
                <Button as={RouterLink} to="/alerts" variant="outline" colorScheme="green">
                  Alerts
                </Button>
                <Button as={RouterLink} to="/notifications" variant="ghost" colorScheme="green">
                  Notifications
                </Button>
              </Stack>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Heading size="lg" color="brand.700">Why this matters</Heading>

        <SimpleGrid mt={6} columns={{ base: 1, md: 3 }} spacing={5}>
          <Feature
            title="Problem"
            desc="Farmers lose value due to spoilage and weak price discovery. Consumers pay more with low traceability."
          />
          <Feature
            title="How it works"
            desc="Book a lot → Hub receives & stores → Lots get listed → Consumers order → Ledger settlement computed."
          />
          <Feature
            title="Demo-ready"
            desc="No login needed for MVP. All flows work end-to-end with live MongoDB data."
          />
        </SimpleGrid>

        <Heading mt={12} size="lg" color="brand.700">Explore</Heading>
        <SimpleGrid mt={6} columns={{ base: 1, md: 2 }} spacing={5}>
          <Card border="1px solid" borderColor="gray.200">
            <CardBody>
              <Heading size="md">Hubs & Booking</Heading>
              <Text mt={2} color="gray.600">
                Farmers can book storage in a hub and generate a lot ID.
              </Text>
              <Button mt={4} as={RouterLink} to="/booking">
                Create Booking
              </Button>
            </CardBody>
          </Card>

          <Card border="1px solid" borderColor="gray.200">
            <CardBody>
              <Heading size="md">Marketplace</Heading>
              <Text mt={2} color="gray.600">
                Browse listed lots, add to cart and place a simulated order.
              </Text>
              <Button mt={4} as={RouterLink} to="/market">
                Go to Market
              </Button>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Box mt={12} p={6} borderRadius="lg" bg="white" border="1px solid" borderColor="gray.200">
          <Heading size="md">Contact</Heading>
          <Text mt={2} color="gray.600">
            Demo MVP for Smart Cold Storage + Farmer-to-Consumer supply chain.
          </Text>
          <Text mt={1} color="gray.600">
             QR scanning, real payments (UPI), and SMS.
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
