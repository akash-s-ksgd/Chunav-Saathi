"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("chunav-token");
      const savedUser = localStorage.getItem("chunav-user");
      if (savedToken && savedUser) {
        setToken(savedToken);
        setLoggedInUser(JSON.parse(savedUser));
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  // Helper to make authenticated API requests
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }, [token]);

  const login = useCallback(async (phone, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
    setToken(data.token);
    setLoggedInUser(data.user);
    localStorage.setItem("chunav-token", data.token);
    localStorage.setItem("chunav-user", JSON.stringify(data.user));
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }
    setToken(data.token);
    setLoggedInUser(data.user);
    localStorage.setItem("chunav-token", data.token);
    localStorage.setItem("chunav-user", JSON.stringify(data.user));
    return data;
  }, []);

  const logout = useCallback(() => {
    setLoggedInUser(null);
    setToken(null);
    localStorage.removeItem("chunav-token");
    localStorage.removeItem("chunav-user");
  }, []);

  // Legacy method for backwards compatibility (used by existing LoginModal)
  const loginLegacy = useCallback((user) => {
    setLoggedInUser(user);
  }, []);

  return (
    <AuthContext.Provider value={{
      loggedInUser,
      token,
      loading,
      login,
      register,
      logout,
      authFetch,
      setLoggedInUser,
      loginLegacy,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
