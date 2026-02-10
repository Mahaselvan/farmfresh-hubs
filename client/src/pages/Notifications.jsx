import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  Skeleton,
  Text,
  VStack,
  Card,
  CardBody,
  HStack,
  useToast
} from "@chakra-ui/react";
import { api } from "../api/endpoints";

export default function Notifications() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications({ limit: 30 });
      setItems(res.data.data || []);
    } catch (err) {
      toast({
        title: "Failed to load notifications",
        description: err?.response?.data?.message || err.message,
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  return (
    <Container maxW="6xl" py={10}>
      <Heading color="green.700">Notifications</Heading>
      <Text mt={2} color="gray.600">
        Demo notifications stored in DB (no SMS).
      </Text>

      <Button mt={4} onClick={fetchNotifs} variant="outline" colorScheme="green">
        Refresh
      </Button>

      <VStack mt={6} spacing={4} align="stretch">
        {loading ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} height="70px" />)
        ) : items.length === 0 ? (
          <Text color="gray.500">No notifications yet.</Text>
        ) : (
          items.map((n) => (
            <Card key={n._id} border="1px solid" borderColor="gray.200">
              <CardBody>
                <HStack justify="space-between" align="start">
                  <Box>
                    <Text fontWeight="bold">{n.message}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </Box>
                  <Badge colorScheme="purple">{n.type}</Badge>
                </HStack>
              </CardBody>
            </Card>
          ))
        )}
      </VStack>
    </Container>
  );
}
