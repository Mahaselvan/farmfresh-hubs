import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/endpoints";

const AuthContext = createContext();

const TOKEN_KEY = "ffh_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const setToken = (value) => {
    if (typeof window === "undefined") return;
    if (!value) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    localStorage.setItem(TOKEN_KEY, value);
  };

  const bootstrap = async () => {
    if (!token) {
      setInitializing(false);
      return;
    }
    try {
      const res = await api.me();
      setUser(res.data.user);
    } catch (err) {
      setToken(null);
      setUser(null);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  const login = async ({ email, phone, password }) => {
    const res = await api.login({ email, phone, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async ({ name, email, phone, password, role }) => {
    const res = await api.register({ name, email, phone, password, role });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => {
    return { user, token, login, register, logout, initializing };
  }, [user, token, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
