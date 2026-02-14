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
  Select,
  Stack,
  Text,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("consumer");
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
      const user = await register({ name, email, phone, password, role });
      const fallback =
        user?.role === "farmer"
          ? "/booking"
          : user?.role === "operator" || user?.role === "admin"
          ? "/dashboard"
          : "/market";
      const target = location.state?.from || fallback;
      navigate(target);
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Container maxW="lg" py={12}>
        <Card border="1px solid" borderColor="gray.200">
          <CardBody>
            <Heading size="lg">Create Account</Heading>
            <Text mt={2} color="gray.600">
              Choose your role and create your profile.
            </Text>

            <Stack as="form" onSubmit={handleSubmit} spacing={4} mt={6}>
              {error ? (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}

              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Email (optional)</FormLabel>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Phone (optional)</FormLabel>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Role</FormLabel>
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="consumer">Consumer</option>
                  <option value="farmer">Farmer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </Select>
              </FormControl>

              <Button type="submit" colorScheme="green" isLoading={loading}>
                Sign Up
              </Button>

              <Text fontSize="sm" color="gray.600">
                Already have an account?{" "}
                <Text as={RouterLink} to="/login" color="green.700" fontWeight={600}>
                  Sign in
                </Text>
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
