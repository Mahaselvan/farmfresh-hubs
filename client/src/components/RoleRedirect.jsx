import { Center, Spinner } from "@chakra-ui/react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Home from "../pages/Home";

export default function RoleRedirect() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <Center py={16}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (!user) {
    return <Home />;
  }

  if (user.role === "farmer") return <Navigate to="/booking" replace />;
  if (user.role === "operator" || user.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/market" replace />;
}
