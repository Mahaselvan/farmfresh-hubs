import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  IconButton,
  Link,
  Spacer,
  Text,
  useDisclosure
} from "@chakra-ui/react";
import { Link as RouterLink, NavLink } from "react-router-dom";
import { HamburgerIcon } from "@chakra-ui/icons";
import { api } from "../api/endpoints";

const NavItem = ({ to, children }) => (
  <Link
    as={NavLink}
    to={to}
    px={2}
    py={1}
    borderRadius="md"
    _hover={{ textDecoration: "none", bg: "gray.100" }}
    style={({ isActive }) => ({
      fontWeight: isActive ? 700 : 500,
      color: isActive ? "#1f6f3e" : "inherit"
    })}
  >
    {children}
  </Link>
);

export default function Navbar() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
  let alive = true;

  const fetchCount = async () => {
    try {
      const res = await api.getNotifications({ limit: 50 });
      if (!alive) return;
      setNotifCount((res.data.data || []).length);
    } catch (err) {
      console.log("Notification fetch failed", err?.message);
    }
  };

  // ✅ schedule first run (avoids sync setState inside effect body)
  const first = setTimeout(fetchCount, 0);

  const t = setInterval(fetchCount, 5000);

  return () => {
    alive = false;
    clearTimeout(first);
    clearInterval(t);
  };
}, []);
  const Links = (
    <>
      <NavItem to="/">Home</NavItem>
      <NavItem to="/booking">Booking</NavItem>
      <NavItem to="/dashboard">Dashboard</NavItem>
      <NavItem to="/market">Marketplace</NavItem>
      <NavItem to="/cart">Cart</NavItem>
      <NavItem to="/alerts">Alerts</NavItem>

      <Link
        as={RouterLink}
        to="/notifications"
        px={2}
        py={1}
        borderRadius="md"
        _hover={{ textDecoration: "none", bg: "gray.100" }}
        fontWeight={600}
      >
        Notifications{" "}
        <Badge ml={1} colorScheme="purple">
          {notifCount}
        </Badge>
      </Link>
    </>
  );

  return (
    <Box borderBottomWidth="1px" bg="white" position="sticky" top="0" zIndex="10">
      <Container maxW="7xl" py={3}>
        <HStack spacing={4}>
          <Text as={RouterLink} to="/" fontWeight="800" color="green.700">
            FarmFresh Hubs
          </Text>

          <HStack spacing={2} display={{ base: "none", md: "flex" }}>
            {Links}
          </HStack>

          <Spacer />

          <Text display={{ base: "none", md: "block" }} fontSize="sm" color="gray.500">
            MVP (no auth)
          </Text>

          <IconButton
            aria-label="Open menu"
            icon={<HamburgerIcon />}
            variant="outline"
            display={{ base: "inline-flex", md: "none" }}
            onClick={onOpen}
          />
        </HStack>
      </Container>

      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Menu</DrawerHeader>
          <DrawerBody>
            <Box display="grid" gap={2} onClick={onClose}>
              {Links}
            </Box>

            <Button mt={6} as={RouterLink} to="/booking" colorScheme="green">
              Quick Booking
            </Button>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
