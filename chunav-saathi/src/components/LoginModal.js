"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { validatePassword } from "@/lib/validation";
import {
  X, Phone, UserPlus, Eye, EyeOff,
  CheckCircle2, Loader2, ShieldCheck, AlertCircle, ChevronDown,
} from "lucide-react";

const INDIAN_STATES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kurnool"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
  "Karnataka": ["Bengaluru Urban", "Mysuru", "Mangaluru", "Hubli-Dharwad", "Belagavi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  "Uttar Pradesh": ["Lucknow", "Varanasi", "Agra", "Kanpur", "Prayagraj"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"],
};

export function LoginModal({ onClose, onLoginSuccess }) {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("login"); // login | register
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Login fields
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regState, setRegState] = useState("");
  const [regDistrict, setRegDistrict] = useState("");
  const [regConstituency, setRegConstituency] = useState("");
  const [regEpic, setRegEpic] = useState("");

  const overlayRef = useRef(null);

  /* ── Close on Escape ─────────────────────────────────────────────── */
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  /* ── Lock body scroll ────────────────────────────────────────────── */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const switchTab = (newTab) => {
    setTab(newTab);
    setErrorMsg("");
    setFieldErrors({});
    setIsSuccess(false);
  };

  /* ── Validate Login ──────────────────────────────────────────────── */
  const validateLogin = () => {
    const errors = {};
    if (!loginPhone || !/^\d{10}$/.test(loginPhone)) {
      errors.phone = "Valid 10-digit phone number required";
    }
    if (!validatePassword(loginPassword)) {
      errors.password = "Password must be at least 8 characters and include a letter and a number";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Validate Register ───────────────────────────────────────────── */
  const validateRegister = () => {
    const errors = {};
    if (!regName || regName.trim().length < 2) errors.name = "Name must be at least 2 characters";
    if (!regPhone || !/^\d{10}$/.test(regPhone)) errors.phone = "Valid 10-digit phone number required";
    if (!validatePassword(regPassword)) errors.password = "Password must be at least 8 characters and include a letter and a number";
    if (regPassword !== regConfirmPassword) errors.confirmPassword = "Passwords do not match";
    if (!regState) errors.state = "State is required";
    if (!regDistrict) errors.district = "District is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ── Handle Login ────────────────────────────────────────────────── */
  const handleLogin = async () => {
    if (!validateLogin()) return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await login(loginPhone, loginPassword);
      setIsSuccess(true);
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(data.user);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Handle Register ─────────────────────────────────────────────── */
  const handleRegister = async () => {
    if (!validateRegister()) return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await register({
        name: regName.trim(),
        phone: regPhone,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        state: regState,
        district: regDistrict,
        constituency: regConstituency,
        epicNumber: regEpic,
      });
      setIsSuccess(true);
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(data.user);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (hasError) => ({
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    border: `1.5px solid ${hasError ? "#ef4444" : "var(--border-strong)"}`,
    background: "var(--surface)", color: "var(--text-primary)",
    fontSize: "0.9rem", fontFamily: "inherit", outline: "none",
    transition: "border-color 0.15s ease",
  });

  const labelStyle = {
    display: "block", fontSize: "0.78rem", fontWeight: 600,
    color: "var(--text-secondary)", marginBottom: "5px",
  };

  const errorStyle = {
    fontSize: "0.72rem", color: "#ef4444", marginTop: "3px",
  };

  const districts = regState ? INDIAN_STATES[regState] || [] : [];

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
    >
      <div
        className="fade-in-up"
        style={{
          width: "100%", maxWidth: "480px",
          background: "var(--surface)",
          borderRadius: "14px",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header stripe */}
        <div
          className="eci-stripe"
          style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}
        >
          <div>
            <div id="login-title" style={{ fontWeight: 700, fontSize: "1.05rem", color: "white" }}>
              {tab === "login" ? t.loginTitle : t.registerTitle}
            </div>
            <div style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.72)", marginTop: "2px" }}>
              {tab === "login" ? t.loginSubtitle : t.registerSubtitle}
            </div>
          </div>
          <button
            id="login-close"
            onClick={onClose}
            style={{
              width: "30px", height: "30px", borderRadius: "7px",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.1)",
              color: "white", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {[
            { key: "login", label: t.navLogin, Icon: Phone },
            { key: "register", label: t.navRegister, Icon: UserPlus },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              id={`login-tab-${key}`}
              onClick={() => switchTab(key)}
              style={{
                padding: "13px", border: "none",
                borderBottom: tab === key ? "2px solid var(--primary)" : "2px solid transparent",
                background: tab === key ? "var(--primary-light)" : "transparent",
                color: tab === key ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: tab === key ? 700 : 500,
                fontSize: "0.83rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                transition: "all 0.15s", fontFamily: "inherit",
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: "22px", overflowY: "auto", flex: 1 }}>

          {/* ── Success ─────────────────────────────────────────── */}
          {isSuccess && (
            <div className="fade-in-up" style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{
                width: "58px", height: "58px", borderRadius: "50%",
                background: "var(--success-light)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
                border: "2px solid var(--success)",
              }}>
                <CheckCircle2 size={28} color="var(--success)" />
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginBottom: "5px" }}>
                {tab === "login" ? "Login Successful!" : "Registration Successful!"}
              </div>
              <div style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                Welcome, Citizen. Signing you in…
              </div>
            </div>
          )}

          {/* ── Error banner ────────────────────────────────────── */}
          {errorMsg && !isSuccess && (
            <div style={{
              display: "flex", gap: "8px", alignItems: "flex-start",
              padding: "10px 14px", borderRadius: "8px",
              background: "#fef2f2", border: "1px solid #fca5a5",
              marginBottom: "14px",
            }}>
              <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
              <span style={{ fontSize: "0.8rem", color: "#dc2626" }}>{errorMsg}</span>
            </div>
          )}

          {/* ── Login Form ──────────────────────────────────────── */}
          {tab === "login" && !isSuccess && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>{t.phoneNumber} *</label>
                <input
                  id="login-phone"
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit number"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  style={inputStyle(fieldErrors.phone)}
                />
                {fieldErrors.phone && <div style={errorStyle}>{fieldErrors.phone}</div>}
              </div>

              <div>
                <label style={labelStyle}>{t.password} *</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoading}
                    style={{ ...inputStyle(fieldErrors.password), paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <div style={errorStyle}>{fieldErrors.password}</div>}
              </div>

              <button
                id="login-submit-btn"
                className="btn-primary"
                onClick={handleLogin}
                disabled={isLoading}
                style={{ width: "100%", justifyContent: "center", opacity: isLoading ? 0.65 : 1 }}
              >
                {isLoading ? (
                  <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Logging in…</>
                ) : (
                  <><ShieldCheck size={15} /> {t.loginBtn}</>
                )}
              </button>

              <div style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {t.noAccount}{" "}
                <button
                  onClick={() => switchTab("register")}
                  style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit", fontSize: "inherit" }}
                >
                  {t.registerHere}
                </button>
              </div>
            </div>
          )}

          {/* ── Register Form ───────────────────────────────────── */}
          {tab === "register" && !isSuccess && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={labelStyle}>{t.fullName} *</label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={isLoading}
                  style={inputStyle(fieldErrors.name)}
                />
                {fieldErrors.name && <div style={errorStyle}>{fieldErrors.name}</div>}
              </div>

              <div>
                <label style={labelStyle}>{t.phoneNumber} *</label>
                <input
                  id="reg-phone"
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  style={inputStyle(fieldErrors.phone)}
                />
                {fieldErrors.phone && <div style={errorStyle}>{fieldErrors.phone}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>{t.password} *</label>
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 chars"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    disabled={isLoading}
                    style={inputStyle(fieldErrors.password)}
                  />
                  {fieldErrors.password && <div style={errorStyle}>{fieldErrors.password}</div>}
                </div>
                <div>
                  <label style={labelStyle}>{t.confirmPassword} *</label>
                  <input
                    id="reg-confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    style={inputStyle(fieldErrors.confirmPassword)}
                  />
                  {fieldErrors.confirmPassword && <div style={errorStyle}>{fieldErrors.confirmPassword}</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>{t.state} *</label>
                  <div style={{ position: "relative" }}>
                    <select
                      id="reg-state"
                      value={regState}
                      onChange={(e) => { setRegState(e.target.value); setRegDistrict(""); }}
                      disabled={isLoading}
                      style={{ ...inputStyle(fieldErrors.state), appearance: "none", paddingRight: "28px", cursor: "pointer" }}
                    >
                      <option value="">{t.selectState}</option>
                      {Object.keys(INDIAN_STATES).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                  </div>
                  {fieldErrors.state && <div style={errorStyle}>{fieldErrors.state}</div>}
                </div>
                <div>
                  <label style={labelStyle}>{t.district} *</label>
                  <div style={{ position: "relative" }}>
                    <select
                      id="reg-district"
                      value={regDistrict}
                      onChange={(e) => setRegDistrict(e.target.value)}
                      disabled={isLoading || !regState}
                      style={{ ...inputStyle(fieldErrors.district), appearance: "none", paddingRight: "28px", cursor: "pointer" }}
                    >
                      <option value="">{t.selectDistrict}</option>
                      {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                  </div>
                  {fieldErrors.district && <div style={errorStyle}>{fieldErrors.district}</div>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t.epicNumber} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({t.optional})</span></label>
                <input
                  id="reg-epic"
                  type="text"
                  maxLength={15}
                  placeholder="e.g. KAR1234567"
                  value={regEpic}
                  onChange={(e) => setRegEpic(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  style={{ ...inputStyle(false), fontFamily: "monospace", letterSpacing: "0.06em" }}
                />
              </div>

              <button
                id="register-submit-btn"
                className="btn-primary"
                onClick={handleRegister}
                disabled={isLoading}
                style={{ width: "100%", justifyContent: "center", opacity: isLoading ? 0.65 : 1 }}
              >
                {isLoading ? (
                  <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Creating account…</>
                ) : (
                  <><UserPlus size={15} /> {t.registerBtn}</>
                )}
              </button>

              <div style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {t.hasAccount}{" "}
                <button
                  onClick={() => switchTab("login")}
                  style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit", fontSize: "inherit" }}
                >
                  {t.loginHere}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div style={{ padding: "10px 22px", borderTop: "1px solid var(--border)", fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center", flexShrink: 0 }}>
            Secured by JWT authentication · Independent student project
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
