"use client";

import { createContext, useContext, useSyncExternalStore, useEffect, useCallback } from "react";

const AuthContext = createContext(null);
const emptyAuthSnapshot = { loggedInUser: null, token: null, loading: true };
let authSnapshot = emptyAuthSnapshot;
const authListeners = new Set();

function publishAuthSnapshot(snapshot) {
  authSnapshot = snapshot;
  authListeners.forEach((listener) => listener());
}

function subscribeToAuth(listener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function getAuthSnapshot() {
  return authSnapshot;
}

export function AuthProvider({ children }) {
  const { loggedInUser, token, loading } = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    () => emptyAuthSnapshot
  );

  // Restore auth state from localStorage on mount
  useEffect(() => {
    let restoredUser = null;
    let restoredToken = null;
    try {
      restoredToken = localStorage.getItem("chunav-token");
      const savedUser = localStorage.getItem("chunav-user");
      if (restoredToken && savedUser) {
        restoredUser = JSON.parse(savedUser);
      } else {
        restoredToken = null;
      }
    } catch {
      restoredToken = null;
      restoredUser = null;
    }
    publishAuthSnapshot({ loggedInUser: restoredUser, token: restoredToken, loading: false });
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
    localStorage.setItem("chunav-token", data.token);
    localStorage.setItem("chunav-user", JSON.stringify(data.user));
    publishAuthSnapshot({ loggedInUser: data.user, token: data.token, loading: false });
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
    localStorage.setItem("chunav-token", data.token);
    localStorage.setItem("chunav-user", JSON.stringify(data.user));
    publishAuthSnapshot({ loggedInUser: data.user, token: data.token, loading: false });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("chunav-token");
    localStorage.removeItem("chunav-user");
    publishAuthSnapshot({ loggedInUser: null, token: null, loading: false });
  }, []);

  // Legacy method for backwards compatibility (used by existing LoginModal)
  const loginLegacy = useCallback((user) => {
    publishAuthSnapshot({ ...authSnapshot, loggedInUser: user });
  }, []);

  const setLoggedInUser = useCallback((user) => {
    publishAuthSnapshot({ ...authSnapshot, loggedInUser: user });
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
