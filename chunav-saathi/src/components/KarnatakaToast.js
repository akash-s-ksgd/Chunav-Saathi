"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { MapPin, X, Languages } from "lucide-react";

export function KarnatakaToast() {
  const { t, setLang } = useLanguage();
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    // Check sessionStorage to avoid showing on every render
    if (sessionStorage.getItem("karnataka-toast-dismissed")) return;

    const detectLocation = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.region === "Karnataka") {
          // Small delay for drama
          setTimeout(() => setShow(true), 1200);
        }
      } catch {
        // silently ignore
      }
    };

    detectLocation();
  }, [dismissed]);

  const dismiss = () => {
    setLeaving(true);
    sessionStorage.setItem("karnataka-toast-dismissed", "1");
    setTimeout(() => {
      setShow(false);
      setLeaving(false);
      setDismissed(true);
    }, 300);
  };

  const switchToKannada = () => {
    setLang("kn");
    dismiss();
  };

  if (!show) return null;

  return (
    <div
      id="karnataka-toast"
      className={leaving ? "toast-out" : "toast-in"}
      style={{
        position: "fixed",
        top: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        maxWidth: "520px",
        width: "calc(100% - 32px)",
      }}
    >
      <div
        style={{
          borderRadius: "16px",
          background: "linear-gradient(135deg, #fff7ed, #fef3c7)",
          border: "1px solid #f97316",
          boxShadow: "0 8px 32px rgba(249,115,22,0.25)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
        className="dark"
      >
        {/* Icon */}
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #f97316, #f59e0b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
          }}
        >
          <MapPin size={20} color="white" />
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "#92400e",
              marginBottom: "10px",
              lineHeight: "1.4",
            }}
          >
            📍 {t.karnatakaBanner}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              id="toast-switch-kannada"
              onClick={switchToKannada}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                border: "none",
                background: "linear-gradient(135deg, #f97316, #f43f5e)",
                color: "white",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
              }}
            >
              <Languages size={14} />
              {t.yes}
            </button>
            <button
              id="toast-dismiss"
              onClick={dismiss}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                border: "1px solid #f97316",
                background: "transparent",
                color: "#92400e",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {t.dismiss}
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          id="toast-close"
          onClick={dismiss}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(249,115,22,0.15)",
            color: "#92400e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            alignSelf: "flex-start",
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
