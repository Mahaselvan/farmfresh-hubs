import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, NavLink } from "react-router-dom";
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
  const { cartItems } = useCart();
  const { user, logout } = useAuth();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const res = await api.getNotifications({ limit: 1, unreadOnly: true });
        setNotifCount(Number(res.data?.meta?.unreadCount || 0));
      } catch {
        setNotifCount(0);
      }
    };

    fetchCount();
    const t = setInterval(fetchCount, 8000);
    return () => clearInterval(t);
  }, [user]);

  const links = useMemo(() => {
    if (!user) return [<NavItem key="home" to="/">Home</NavItem>];

    if (user.role === "farmer") {
      return [
        <NavItem key="home" to="/farmer">Home</NavItem>,
        <NavItem key="produce" to="/farmer">My Produce</NavItem>,
        <NavItem key="book" to="/booking">Book Storage</NavItem>,
        <NavItem key="notes" to="/notifications">Notifications</NavItem>
      ];
    }

    if (user.role === "consumer") {
      return [
        <NavItem key="market" to="/market">Marketplace</NavItem>,
        <NavItem key="cart" to="/cart">Cart <Badge ml={1} colorScheme="green">{cartItems.length}</Badge></NavItem>,
        <NavItem key="orders" to="/orders">Orders</NavItem>,
        <NavItem key="notes" to="/notifications">Notifications</NavItem>
      ];
    }

    return [
      <NavItem key="dash" to="/dashboard">Dashboard</NavItem>,
      <NavItem key="orders" to="/orders">Orders</NavItem>,
      <NavItem key="notes" to="/notifications">Notifications</NavItem>
    ];
  }, [user, cartItems.length]);

  return (
    <Box borderBottomWidth="1px" bg="white" position="sticky" top="0" zIndex="10">
      <Container maxW="7xl" py={3}>
        <HStack spacing={4}>
          <Text as={RouterLink} to="/" fontWeight="800" color="green.700">FarmFresh Hubs</Text>

          <HStack spacing={2} display={{ base: "none", md: "flex" }}>{links}</HStack>
          <Spacer />

          {user ? (
            <HStack spacing={2}>
              <Link as={RouterLink} to="/notifications" fontWeight="600">
                Notifications <Badge ml={1} colorScheme="purple">{notifCount}</Badge>
              </Link>
              <Button size="sm" variant="outline" onClick={logout}>Logout</Button>
            </HStack>
          ) : (
            <HStack spacing={2}>
              <Button size="sm" as={RouterLink} to="/auth?mode=login" variant="ghost">Login</Button>
              <Button size="sm" as={RouterLink} to="/auth?mode=signup" colorScheme="green">Sign Up</Button>
            </HStack>
          )}

          <IconButton aria-label="Open menu" icon={<HamburgerIcon />} variant="outline" display={{ base: "inline-flex", md: "none" }} onClick={onOpen} />
        </HStack>
      </Container>

      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Menu</DrawerHeader>
          <DrawerBody>
            <Box display="grid" gap={2} onClick={onClose}>{links}</Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
