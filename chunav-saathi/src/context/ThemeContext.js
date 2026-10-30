"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeCtx = createContext({ theme: "light", setTheme: () => {}, mounted: false });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");
  const [mounted, setMounted] = useState(false);

  // Read saved preference once on mount
  useEffect(() => {
    const saved = localStorage.getItem("chunav-theme") || "light";
    applyTheme(saved);
    setThemeState(saved);
    setMounted(true);
  }, []);

  const applyTheme = (t) => {
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem("chunav-theme", t);
    applyTheme(t);
  };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
