import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
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
      <Container maxW="6xl" py={8}>
        <Heading color="green.700">Cart</Heading>
        <Text mt={2}>Please sign in to view your cart.</Text>
        <Button as={RouterLink} to="/login" mt={6} colorScheme="green">Login</Button>
      </Container>
    );
  }

  return (
    <Container maxW="5xl" py={8}>
      <Heading color="green.700">Your Cart</Heading>

      {cartItems.length === 0 ? (
        <Card mt={6}><CardBody><Text>Your cart is empty.</Text><Button as={RouterLink} to="/market" mt={4} colorScheme="green">Browse Fresh Produce</Button></CardBody></Card>
      ) : (
        <VStack mt={6} spacing={3} align="stretch">
          {cartItems.map((item) => (
            <Card key={item.lot._id}>
              <CardBody>
                <Text fontWeight="700">{item.lot.crop}</Text>
                <Text fontSize="sm">Lot ID: {item.lot.lotId}</Text>
                <Text fontSize="sm">₹{item.lot.expectedPrice}/kg</Text>
                <HStack mt={2}>
                  <Text>Qty</Text>
                  <Input
                    maxW="100px"
                    type="number"
                    min={1}
                    max={item.lot.availableQtyKg ?? item.lot.qtyKg}
                    value={item.qtyKg}
                    onChange={(e) => updateQty(item.lot._id, Number(e.target.value))}
                  />
                </HStack>
                <Text mt={2} fontWeight="600">₹{Number(item.lot.expectedPrice) * Number(item.qtyKg)}</Text>
                <Button mt={3} size="sm" variant="outline" colorScheme="red" onClick={() => {
                  removeFromCart(item.lot._id);
                  toast({ title: "Removed", status: "info" });
                }}>Remove</Button>
              </CardBody>
            </Card>
          ))}

          <Card>
            <CardBody>
              <HStack justify="space-between">
                <Text fontWeight="700">Total</Text>
                <Text fontWeight="700">₹{Math.round(totalAmount)}</Text>
              </HStack>
              <Button as={RouterLink} to="/checkout" mt={4} width="100%" h="44px" colorScheme="green">Place Order</Button>
            </CardBody>
          </Card>
        </VStack>
      )}
    </Container>
  );
}
