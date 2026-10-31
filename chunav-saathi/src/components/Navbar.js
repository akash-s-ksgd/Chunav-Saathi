"use client";

import { useTheme } from "@/context/ThemeContext";
import { useEffect, useState } from "react";
import { Sun, Moon, Vote, Globe, LogIn, UserCircle2, CheckCircle2, Menu, X, LogOut, BarChart3, FileText, LayoutDashboard, Home, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LoginModal } from "@/components/LoginModal";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", labelKey: "navHome", Icon: Home },
  { href: "/dashboard", labelKey: "navDashboard", Icon: LayoutDashboard, auth: true },
  { href: "/analytics", labelKey: "navAnalytics", Icon: BarChart3 },
  { href: "/complaints", labelKey: "navComplaints", Icon: FileText, auth: true },
  { href: "/profile", labelKey: "navProfile", Icon: User, auth: true },
];

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuState, setMobileMenuState] = useState({ open: false, pathname: null });
  const { loggedInUser, logout } = useAuth();
  const { lang, setLang, t, translations } = useLanguage();
  const pathname = usePathname();
  const mobileMenu = mobileMenuState.open && mobileMenuState.pathname === pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nextTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const themeIcon = theme === "dark" ? <Moon size={16} /> : <Sun size={16} />;

  const langOptions = Object.values(translations).map((tr) => ({
    code: tr.code,
    label: tr.label,
  }));

  const handleLoginSuccess = (user) => {
    // Already handled by AuthContext
  };

  const visibleLinks = NAV_LINKS.filter(l => !l.auth || loggedInUser);

  return (
    <>
      {/* ── Project notice ────────────────────────────────────────── */}
      <div
        className="project-topbar"
        style={{
          background: "#1d4ed8",
          color: "rgba(255,255,255,0.85)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 101,
        }}
      >
        <span>Independent student project · Not affiliated with ECI</span>
        <span>Helpline: <strong style={{ color: "white" }}>1950</strong> · voters.eci.gov.in</span>
      </div>

      {/* ── Main navbar ────────────────────────────────────────────── */}
      <nav
        className="main-navbar"
        style={{
          position: "fixed",
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
          className="navbar-inner"
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 12px",
            height: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
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
              <div className="hide-mobile" style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                {t.tagline}
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            {visibleLinks.map(({ href, labelKey, Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "7px 8px", borderRadius: "7px",
                    fontSize: "0.8rem", fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--primary)" : "var(--text-secondary)",
                    background: isActive ? "var(--primary-light)" : "transparent",
                    textDecoration: "none", transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon size={14} />
                  {t[labelKey]}
                </Link>
              );
            })}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
            {/* Language switcher */}
            <div className="navbar-language-switcher hide-mobile" style={{ display: "flex", gap: "2px", alignItems: "center" }}>
              <Globe size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              {langOptions.map((option) => (
                <button
                  key={option.code}
                  id={`lang-${option.code}`}
                  onClick={() => setLang(option.code)}
                  style={{
                    padding: "4px 6px",
                    borderRadius: "6px",
                    fontSize: "12px",
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
            <button
                id="theme-toggle"
                onClick={nextTheme}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
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

            {/* Login / User button */}
            {loggedInUser ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", borderRadius: "8px",
                    border: "1.5px solid var(--success)",
                    background: "var(--success-light)",
                    fontSize: "0.78rem", fontWeight: 600,
                    color: "var(--success)",
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span className="hide-mobile">{loggedInUser.name || "Verified Citizen"}</span>
                  {loggedInUser.role === "admin" && (
                    <span style={{
                      background: "var(--primary)", color: "white",
                      padding: "1px 6px", borderRadius: "4px",
                      fontSize: "12px", fontWeight: 700,
                    }}>
                      {t.admin}
                    </span>
                  )}
                </div>
                <button
                  id="logout-btn"
                  onClick={logout}
                  title={t.navLogout}
                  aria-label={t.navLogout}
                  style={{
                    width: "34px", height: "34px", borderRadius: "8px",
                    border: "1.5px solid var(--border)", background: "transparent",
                    color: "var(--text-secondary)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s ease", flexShrink: 0,
                  }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                id="login-btn"
                onClick={() => setShowLogin(true)}
                aria-label={t.navLogin}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "8px 10px", borderRadius: "8px",
                  border: "none", background: "var(--primary)",
                  color: "white", fontWeight: 600,
                  fontSize: "0.83rem", cursor: "pointer",
                  transition: "background 0.15s ease",
                  flexShrink: 0, fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-dark)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary)")}
              >
                <LogIn size={15} />
                <span className="hide-mobile">{t.navLogin}</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              id="mobile-menu-btn"
              className="hide-desktop"
              onClick={() => setMobileMenuState({ open: !mobileMenu, pathname })}
              aria-label={mobileMenu ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenu}
              style={{
                width: "34px", height: "34px", borderRadius: "8px",
                border: "1.5px solid var(--border)", background: "transparent",
                color: "var(--text-secondary)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {mobileMenu ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div
            className="fade-in-up hide-desktop"
            style={{
              borderTop: "1px solid var(--border)",
              background: "var(--surface)",
              padding: "12px 24px 16px",
            }}
          >
            {/* Mobile nav links */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "12px" }}>
              {visibleLinks.map(({ href, labelKey, Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "10px 14px", borderRadius: "8px",
                      fontSize: "0.88rem", fontWeight: isActive ? 700 : 500,
                      color: isActive ? "var(--primary)" : "var(--text-primary)",
                      background: isActive ? "var(--primary-light)" : "transparent",
                      textDecoration: "none",
                    }}
                  >
                    <Icon size={16} />
                    {t[labelKey]}
                  </Link>
                );
              })}
            </div>

            {/* Mobile language switcher */}
            <div style={{ display: "flex", gap: "4px", alignItems: "center", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
              <Globe size={13} style={{ color: "var(--text-muted)" }} />
              {langOptions.map((option) => (
                <button
                  key={option.code}
                  onClick={() => setLang(option.code)}
                  style={{
                    padding: "5px 12px", borderRadius: "6px", fontSize: "0.78rem",
                    fontWeight: 600,
                    border: lang === option.code ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                    background: lang === option.code ? "var(--primary-light)" : "transparent",
                    color: lang === option.code ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
