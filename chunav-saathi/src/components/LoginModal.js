"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Phone,
  CreditCard,
  ChevronDown,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman & Nicobar Islands","Chandigarh","Dadra & Nagar Haveli",
  "Daman & Diu","Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const STAGES = { IDLE: "idle", SENDING: "sending", OTP_SENT: "otp_sent", VERIFYING: "verifying", SUCCESS: "success" };

export function LoginModal({ onClose, onLoginSuccess }) {
  const [tab, setTab] = useState("phone"); // "phone" | "epic"
  const [stage, setStage] = useState(STAGES.IDLE);

  // Phone fields
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  // EPIC fields
  const [epicNumber, setEpicNumber] = useState("");
  const [epicState, setEpicState] = useState("");

  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const resetStage = () => { setStage(STAGES.IDLE); setOtp(""); };
  const switchTab = (t) => { setTab(t); resetStage(); setPhone(""); setEpicNumber(""); setEpicState(""); };

  /* ── Simulated flows ────────────────────────────────────────────── */
  const handleSendOtp = () => {
    if (phone.replace(/\D/g, "").length < 10) return;
    setStage(STAGES.SENDING);
    setTimeout(() => setStage(STAGES.OTP_SENT), 1400);
  };

  const handleVerifyOtp = () => {
    if (otp.length < 4) return;
    setStage(STAGES.VERIFYING);
    setTimeout(() => {
      setStage(STAGES.SUCCESS);
      setTimeout(() => { onLoginSuccess({ method: "phone", phone }); onClose(); }, 1800);
    }, 1200);
  };

  const handleEpicLogin = () => {
    if (!epicNumber.trim() || !epicState) return;
    setStage(STAGES.VERIFYING);
    setTimeout(() => {
      setStage(STAGES.SUCCESS);
      setTimeout(() => { onLoginSuccess({ method: "epic", epicNumber }); onClose(); }, 1800);
    }, 1500);
  };

  const isLoading = stage === STAGES.SENDING || stage === STAGES.VERIFYING;
  const isSuccess = stage === STAGES.SUCCESS;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div
        className="fade-in-up"
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "var(--surface)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Header stripe */}
        <div
          className="eci-stripe"
          style={{
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              id="login-modal-title"
              style={{ fontWeight: 700, fontSize: "1.05rem", color: "white" }}
            >
              Citizen Login
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", marginTop: "2px" }}>
              Election Commission of India · Secure Portal
            </div>
          </div>
          <button
            id="login-modal-close"
            onClick={onClose}
            style={{
              width: "32px", height: "32px", borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.1)",
              color: "white", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {[
            { key: "phone", label: "Phone OTP", Icon: Phone },
            { key: "epic",  label: "Voter ID (EPIC)", Icon: CreditCard },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              id={`login-tab-${key}`}
              onClick={() => switchTab(key)}
              style={{
                padding: "14px",
                border: "none",
                borderBottom: tab === key ? "2px solid var(--primary)" : "2px solid transparent",
                background: tab === key ? "var(--primary-light)" : "transparent",
                color: tab === key ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: tab === key ? 700 : 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.15s ease",
                fontFamily: "inherit",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {/* ── Success state ── */}
          {isSuccess && (
            <div
              className="fade-in-up"
              style={{ textAlign: "center", padding: "16px 0" }}
            >
              <div
                style={{
                  width: "64px", height: "64px", borderRadius: "50%",
                  background: "var(--success-light)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                  border: "2px solid var(--success)",
                }}
              >
                <CheckCircle2 size={32} color="var(--success)" />
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: "6px" }}>
                Verified Successfully!
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Welcome, Citizen. Redirecting you to your dashboard…
              </div>
            </div>
          )}

          {/* ── Phone OTP tab ── */}
          {tab === "phone" && !isSuccess && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Enter your registered mobile number to receive a One-Time Password.
              </div>

              {/* Phone input row */}
              <div style={{ display: "flex", gap: "8px" }}>
                <div
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "10px 12px",
                    border: "1.5px solid var(--border-strong)",
                    borderRadius: "8px",
                    background: "var(--muted-bg)",
                    fontWeight: 600, fontSize: "0.9rem",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    minWidth: "58px",
                  }}
                >
                  🇮🇳 +91
                </div>
                <input
                  id="phone-input"
                  className="civic-input"
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  disabled={stage === STAGES.OTP_SENT || isLoading}
                  style={{ flex: 1 }}
                />
              </div>

              {/* Send OTP button */}
              {stage === STAGES.IDLE && (
                <button
                  id="send-otp-btn"
                  className="btn-primary"
                  onClick={handleSendOtp}
                  disabled={phone.length < 10}
                  style={{ width: "100%", justifyContent: "center", opacity: phone.length < 10 ? 0.5 : 1 }}
                >
                  Send OTP
                </button>
              )}

              {stage === STAGES.SENDING && (
                <button className="btn-primary" disabled style={{ width: "100%", justifyContent: "center", opacity: 0.7 }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Sending OTP…
                </button>
              )}

              {/* OTP verification field */}
              {stage === STAGES.OTP_SENT && (
                <div className="slide-in-right" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "var(--success-light)",
                      border: "1px solid var(--success)",
                      fontSize: "0.8rem",
                      color: "var(--success)",
                      fontWeight: 600,
                    }}
                  >
                    ✓ OTP sent to +91 {phone}
                  </div>
                  <input
                    id="otp-input"
                    className="civic-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                  <button
                    id="verify-otp-btn"
                    className="btn-primary"
                    onClick={handleVerifyOtp}
                    disabled={otp.length < 4}
                    style={{ width: "100%", justifyContent: "center", opacity: otp.length < 4 ? 0.5 : 1 }}
                  >
                    {stage === STAGES.VERIFYING
                      ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Verifying…</>
                      : "Verify & Login"
                    }
                  </button>
                  <button
                    onClick={resetStage}
                    style={{
                      background: "none", border: "none", color: "var(--primary)",
                      fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline",
                      fontFamily: "inherit",
                    }}
                  >
                    Change number
                  </button>
                </div>
              )}

              {stage === STAGES.VERIFYING && tab === "phone" && (
                <button className="btn-primary" disabled style={{ width: "100%", justifyContent: "center", opacity: 0.7 }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Verifying…
                </button>
              )}
            </div>
          )}

          {/* ── Voter ID (EPIC) tab ── */}
          {tab === "epic" && !isSuccess && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Enter your EPIC (Electors Photo Identity Card) number and state to verify your identity.
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                  EPIC Number
                </label>
                <input
                  id="epic-input"
                  className="civic-input"
                  type="text"
                  maxLength={10}
                  placeholder="e.g. KA/01/123/456789"
                  value={epicNumber}
                  onChange={(e) => setEpicNumber(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                  State / UT
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    id="epic-state-select"
                    className="civic-input"
                    value={epicState}
                    onChange={(e) => setEpicState(e.target.value)}
                    disabled={isLoading}
                    style={{ appearance: "none", paddingRight: "36px", cursor: "pointer" }}
                  >
                    <option value="">Select your state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    style={{
                      position: "absolute", right: "12px", top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-secondary)", pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              <button
                id="epic-login-btn"
                className="btn-primary"
                onClick={handleEpicLogin}
                disabled={!epicNumber.trim() || !epicState || isLoading}
                style={{
                  width: "100%", justifyContent: "center",
                  opacity: !epicNumber.trim() || !epicState ? 0.5 : 1,
                }}
              >
                {isLoading
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Verifying…</>
                  : <><ShieldCheck size={16} /> Verify & Login</>
                }
              </button>
            </div>
          )}
        </div>

        {/* Footer disclaimer */}
        {!isSuccess && (
          <div
            style={{
              padding: "12px 24px",
              borderTop: "1px solid var(--border)",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            🔒 This is a simulated login for demonstration purposes only.
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
