import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Heading,
  HStack,
  Skeleton,
  Text,
  VStack,
  useToast
} from "@chakra-ui/react";
import { api } from "../api/endpoints";

export default function Notifications() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications({ limit: 50 });
      setItems(res.data.data || []);
      setUnreadCount(Number(res.data?.meta?.unreadCount || 0));
    } catch (err) {
      toast({ title: "Failed to load notifications", description: err?.response?.data?.message || err.message, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markRead = async (id) => {
    await api.markNotificationRead(id);
    fetchNotifs();
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    fetchNotifs();
  };

  return (
    <Container maxW="6xl" py={8}>
      <HStack justify="space-between">
        <Heading color="green.700">Notifications</Heading>
        <Badge colorScheme="purple">Unread: {unreadCount}</Badge>
      </HStack>
      <HStack mt={3}>
        <Button onClick={fetchNotifs} variant="outline" colorScheme="green">Refresh</Button>
        <Button onClick={markAllRead} variant="ghost">Mark all as read</Button>
      </HStack>

      <VStack mt={6} spacing={3} align="stretch">
        {loading ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} height="70px" />)
        ) : items.length === 0 ? (
          <Text color="gray.500">You're all caught up.</Text>
        ) : (
          items.map((n) => (
            <Card key={n._id} borderWidth={n.read ? "1px" : "2px"} borderColor={n.read ? "gray.200" : "green.300"}>
              <CardBody>
                <HStack justify="space-between" align="start">
                  <Box>
                    <Text fontWeight="bold">{n.title || "Notification"}</Text>
                    <Text>{n.message}</Text>
                    <Text fontSize="sm" color="gray.600">{new Date(n.createdAt).toLocaleString()}</Text>
                  </Box>
                  <VStack align="end">
                    <Badge colorScheme={n.read ? "gray" : "green"}>{n.read ? "Read" : "Unread"}</Badge>
                    {!n.read ? <Button size="xs" onClick={() => markRead(n._id)}>Mark as read</Button> : null}
                  </VStack>
                </HStack>
              </CardBody>
            </Card>
          ))
        )}
      </VStack>
    </Container>
  );
}
