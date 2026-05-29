"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Vote, Globe, LogIn, UserCircle2, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LoginModal } from "@/components/LoginModal";
import Link from "next/link";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const { lang, setLang, t, translations } = useLanguage();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nextTheme = () => {
    const cycle = { light: "dark", dark: "system", system: "light" };
    setTheme(cycle[theme] || "dark");
  };

  const themeIcon = mounted
    ? { light: <Sun size={16} />, dark: <Moon size={16} />, system: <Monitor size={16} /> }[theme] ?? <Sun size={16} />
    : null;

  const langOptions = Object.values(translations).map((tr) => ({
    code: tr.code,
    label: tr.label,
  }));

  const handleLoginSuccess = (user) => {
    setLoggedInUser(user);
  };

  return (
    <>
      {/* ── ECI top-bar stripe ─────────────────────────────────────── */}
      <div
        style={{
          background: "#1d4ed8",
          padding: "5px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.72rem",
          color: "rgba(255,255,255,0.85)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 101,
        }}
      >
        <span className="hide-mobile">Election Commission of India · Official Voter Education Portal</span>
        <span>Helpline: <strong style={{ color: "white" }}>1950</strong> · voters.eci.gov.in</span>
      </div>

      {/* ── Main navbar ────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: "28px",
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? "var(--nav-bg)" : "var(--surface)",
          borderBottom: `1px solid ${scrolled ? "var(--border)" : "var(--border)"}`,
          boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.07)" : "none",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 24px",
            height: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Vote size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-primary)", lineHeight: 1 }}>
                {t.navTitle}
              </div>
              <div className="hide-mobile" style={{ fontSize: "0.65rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                {t.tagline}
              </div>
            </div>
          </Link>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
            {/* Language switcher */}
            <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
              <Globe size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              {langOptions.map((option) => (
                <button
                  key={option.code}
                  id={`lang-${option.code}`}
                  onClick={() => setLang(option.code)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    border: lang === option.code ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: lang === option.code ? "var(--primary-light)" : "transparent",
                    color: lang === option.code ? "var(--primary)" : "var(--text-secondary)",
                    fontFamily: "inherit",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            {mounted && (
              <button
                id="theme-toggle"
                onClick={nextTheme}
                title={`Theme: ${theme}`}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  border: "1.5px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.color = "var(--primary)";
                  e.currentTarget.style.background = "var(--primary-light)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {themeIcon}
              </button>
            )}

            {/* Login / User button */}
            {loggedInUser ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid var(--success)",
                  background: "var(--success-light)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--success)",
                }}
              >
                <CheckCircle2 size={14} />
                <span className="hide-mobile">Verified Citizen</span>
              </div>
            ) : (
              <button
                id="login-btn"
                onClick={() => setShowLogin(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#1d4ed8",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.83rem",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  flexShrink: 0,
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1e40af")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1d4ed8")}
              >
                <LogIn size={15} />
                <span className="hide-mobile">Login / Sign In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}
