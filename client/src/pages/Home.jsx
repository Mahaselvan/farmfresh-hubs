import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Icon,
  Image,
  SimpleGrid,
  Text,
  Card,
  CardBody,
  Stack
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { BellIcon, CalendarIcon, SettingsIcon } from "@chakra-ui/icons";
import { useTranslation } from "react-i18next";

const Feature = ({ title, desc }) => (
  <Card border="1px solid" borderColor="gray.200">
    <CardBody>
      <Heading size="md" color="brand.700">{title}</Heading>
      <Text mt={2} color="gray.600">{desc}</Text>
    </CardBody>
  </Card>
);

const farmerIconSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="20" fill="#F7F3EE"/>
  <path d="M22 86C30 78 46 72 64 72C82 72 98 78 106 86V104H22V86Z" fill="#FFE1C7"/>
  <circle cx="64" cy="54" r="20" fill="#FFE1C7"/>
  <path d="M40 44C52 28 76 28 88 44L96 40C86 16 42 16 32 40L40 44Z" fill="#D9663D"/>
  <path d="M34 44C44 30 84 30 94 44L104 40C92 16 36 16 24 40L34 44Z" fill="#F07B4C"/>
  <path d="M52 58C52 61.3 49.3 64 46 64C42.7 64 40 61.3 40 58C40 54.7 42.7 52 46 52C49.3 52 52 54.7 52 58Z" fill="#2F2A2A"/>
  <path d="M88 58C88 61.3 85.3 64 82 64C78.7 64 76 61.3 76 58C76 54.7 78.7 52 82 52C85.3 52 88 54.7 88 58Z" fill="#2F2A2A"/>
  <path d="M54 72C57 76 71 76 74 72" stroke="#2F2A2A" stroke-width="3" stroke-linecap="round"/>
  <path d="M24 96H8V88H24V96Z" fill="#2F7B45"/>
  <path d="M104 96H120V88H104V96Z" fill="#2F7B45"/>
  <path d="M26 90C18 84 16 72 24 62C30 54 44 52 50 58C42 58 34 64 34 74C34 82 38 88 46 90H26Z" fill="#2F7B45"/>
  <path d="M102 90C110 84 112 72 104 62C98 54 84 52 78 58C86 58 94 64 94 74C94 82 90 88 82 90H102Z" fill="#2F7B45"/>
  <path d="M96 106H32V84C32 74 40 66 50 66H78C88 66 96 74 96 84V106Z" fill="#5AA35C"/>
  <path d="M92 42H106V104H98V50H92V42Z" fill="#4D4D4D"/>
  <path d="M100 32C107 32 112 37 112 44C112 51 107 56 100 56C93 56 88 51 88 44C88 37 93 32 100 32Z" fill="#7D7D7D"/>
  </svg>`
)}`;

export default function Home() {
  const { t } = useTranslation();

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
              <Image src={farmerIconSvg} alt="Farmer" boxSize="96px" mb={3} />
              <HStack spacing={3}>
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
                <Button as={RouterLink} to="/market" colorScheme="green">
                  Marketplace
                </Button>
                <Button as={RouterLink} to="/cart" variant="outline" colorScheme="green">
                  View Cart
                </Button>
                <Button as={RouterLink} to="/notifications" variant="ghost" colorScheme="green">
                  Notifications
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
