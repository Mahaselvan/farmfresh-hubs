import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  useToast
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Cart() {
  const toast = useToast();
  const { cartItems, removeFromCart, updateQty, totalAmount } = useCart();
  const { user } = useAuth();

  if (!user) {
    return (
      <Container maxW="6xl" py={10}>
        <Heading color="green.700">Cart</Heading>
        <Text mt={2} color="gray.600">
          Please sign in to view your cart.
        </Text>
        <Button as={RouterLink} to="/login" mt={6} colorScheme="green">
          Login
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="6xl" py={10}>
      <Heading color="green.700">Cart</Heading>
      <Text mt={2} color="gray.600">Review items before checkout.</Text>

      {cartItems.length === 0 ? (
        <Box mt={6}>
          <Text color="gray.500">Cart is empty.</Text>
          <Button as={RouterLink} to="/market" mt={4} colorScheme="green">
            Go to Marketplace
          </Button>
        </Box>
      ) : (
        <Box mt={6}>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Crop</Th>
                <Th>Lot ID</Th>
                <Th isNumeric>Price/kg</Th>
                <Th isNumeric>Qty (kg)</Th>
                <Th isNumeric>Total</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {cartItems.map((item) => (
                <Tr key={item.lot._id}>
                  <Td>{item.lot.crop}</Td>
                  <Td>{item.lot.lotId}</Td>
                  <Td isNumeric>₹{item.lot.expectedPrice}</Td>
                  <Td isNumeric>
                    <Input
                      size="sm"
                      width="90px"
                      type="number"
                      min={1}
                      max={item.lot.qtyKg}
                      value={item.qtyKg}
                      onChange={(e) => updateQty(item.lot._id, Number(e.target.value))}
                    />
                  </Td>
                  <Td isNumeric>
                    ₹{Number(item.lot.expectedPrice) * Number(item.qtyKg)}
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => {
                        removeFromCart(item.lot._id);
                        toast({
                          title: "Removed",
                          status: "info",
                          duration: 1500,
                          isClosable: true
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <HStack justify="space-between" mt={6}>
            <Text fontSize="lg" fontWeight="bold">
              Total: ₹{totalAmount}
            </Text>

            <Button as={RouterLink} to="/checkout" colorScheme="green">
              Checkout
            </Button>
          </HStack>
        </Box>
      )}
    </Container>
  );
}
