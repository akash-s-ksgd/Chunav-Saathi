"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

const ThemeCtx = createContext({ theme: "light", setTheme: () => {} });
let themeSnapshot = "light";
const themeListeners = new Set();

function notifyThemeChange() {
  themeListeners.forEach((listener) => listener());
}

function subscribeToTheme(listener) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function getThemeSnapshot() {
  return themeSnapshot;
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");

  // Read saved preference once on mount
  useEffect(() => {
    const saved = localStorage.getItem("chunav-theme") || "light";
    applyTheme(saved);
    themeSnapshot = saved;
    notifyThemeChange();
  }, []);

  const setTheme = (t) => {
    themeSnapshot = t;
    localStorage.setItem("chunav-theme", t);
    applyTheme(t);
    notifyThemeChange();
  };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
