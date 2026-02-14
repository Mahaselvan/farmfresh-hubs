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
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

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
  const { cartItems } = useCart();
  const { user, logout } = useAuth();
  const cartCount = cartItems.length;

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
      <NavItem to="/market">Marketplace</NavItem>
      <Link
        as={RouterLink}
        to="/cart"
        px={2}
        py={1}
        borderRadius="md"
        _hover={{ textDecoration: "none", bg: "gray.100" }}
        fontWeight={600}
      >
        Cart{" "}
        <Badge ml={1} colorScheme="green">
          {cartCount}
        </Badge>
      </Link>

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

          {user ? (
            <HStack spacing={2}>
              <Text display={{ base: "none", md: "block" }} fontSize="sm" color="gray.500">
                {user?.name || user?.email || user?.phone} • {user?.role}
              </Text>
              <Button size="sm" variant="outline" onClick={logout}>
                Logout
              </Button>
            </HStack>
          ) : (
            <HStack spacing={2}>
              <Button size="sm" as={RouterLink} to="/login" variant="ghost">
                Login
              </Button>
              <Button size="sm" as={RouterLink} to="/signup" colorScheme="green">
                Sign Up
              </Button>
            </HStack>
          )}

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

            {user ? (
              <Button mt={6} variant="outline" onClick={logout}>
                Logout
              </Button>
            ) : (
              <HStack mt={6} spacing={2}>
                <Button as={RouterLink} to="/login" variant="ghost" onClick={onClose}>
                  Login
                </Button>
                <Button as={RouterLink} to="/signup" colorScheme="green" onClick={onClose}>
                  Sign Up
                </Button>
              </HStack>
            )}

          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
