import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password || (!email && !phone)) {
      setError("Email or phone and password are required.");
      return;
    }

    try {
      setLoading(true);
      const user = await login({ email, phone, password });
      const fallback =
        user?.role === "farmer"
          ? "/booking"
          : user?.role === "operator" || user?.role === "admin"
          ? "/dashboard"
          : "/market";
      const target = location.state?.from || fallback;
      navigate(target);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Container maxW="lg" py={12}>
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <Heading size="lg">Login</Heading>
            <Text mt={2} color="gray.600">
              Use your email or phone number to sign in.
            </Text>

            <Stack as="form" onSubmit={handleSubmit} spacing={4} mt={6}>
              {error ? (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}

              <FormControl>
                <FormLabel>Email (optional)</FormLabel>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Phone</FormLabel>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </FormControl>

              <Button type="submit" colorScheme="green" isLoading={loading}>
                Sign In
              </Button>

              <Text fontSize="sm" color="gray.600">
                Don’t have an account?{" "}
                <Text as={RouterLink} to="/signup" color="green.700" fontWeight={600}>
                  Create one
                </Text>
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
