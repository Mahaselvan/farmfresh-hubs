import {
  Box,
  Button,
  Container,
  Heading,
  SimpleGrid,
  Text,
  Card,
  CardBody,
  Stack
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

const Feature = ({ title, desc }) => (
  <Card border="1px solid" borderColor="gray.200">
    <CardBody>
      <Heading size="md" color="brand.700">{title}</Heading>
      <Text mt={2} color="gray.600">{desc}</Text>
    </CardBody>
  </Card>
);

export default function Home() {
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
