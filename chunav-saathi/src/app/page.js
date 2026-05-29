"use client";

import { useLanguage } from "@/context/LanguageContext";
import { ElectionTimeline } from "@/components/ElectionTimeline";
import { EciActionHub } from "@/components/EciActionHub";
import { ChatUI } from "@/components/ChatUI";
import { KarnatakaToast } from "@/components/KarnatakaToast";
import { Vote, Shield, Phone } from "lucide-react";

export default function HomePage() {
  const { t } = useLanguage();

  const stats = [
    { value: "97 Cr+",  label: "Registered Voters",  id: "stat-voters" },
    { value: "1950",    label: "Voter Helpline",       id: "stat-helpline" },
    { value: "Form 6",  label: "New Registration",     id: "stat-form6" },
    { value: "543",     label: "Lok Sabha Seats",      id: "stat-seats" },
  ];

  return (
    <>
      <KarnatakaToast />

      <div style={{ paddingTop: "88px" }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              padding: "48px 24px 40px",
            }}
          >
            {/* Badge */}
            <div className="section-label" style={{ marginBottom: "16px" }}>
              <Shield size={11} />
              Election Commission of India · Official Education Platform
            </div>

            <h1
              style={{
                fontSize: "clamp(1.75rem, 4vw, 3rem)",
                fontWeight: 900,
                lineHeight: 1.15,
                color: "var(--text-primary)",
                marginBottom: "14px",
                maxWidth: "700px",
                letterSpacing: "-0.02em",
              }}
            >
              {t.heroTitle}
            </h1>

            <p
              style={{
                fontSize: "clamp(0.9rem, 1.8vw, 1.05rem)",
                color: "var(--text-secondary)",
                maxWidth: "580px",
                lineHeight: 1.7,
                marginBottom: "36px",
              }}
            >
              {t.heroSub}
            </p>

            {/* ── Stats row ─────────────────────────────────────────── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "1px",
                background: "var(--border)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                overflow: "hidden",
                maxWidth: "680px",
              }}
            >
              {stats.map((stat) => (
                <div
                  key={stat.id}
                  id={stat.id}
                  style={{
                    background: "var(--surface)",
                    padding: "18px 20px",
                    textAlign: "center",
                  }}
                >
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dashboard ─────────────────────────────────────────────── */}
        <section style={{ background: "var(--background)" }}>
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              padding: "32px 24px 64px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
              alignItems: "start",
            }}
          >
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <ElectionTimeline />
              <EciActionHub />
            </div>

            {/* Right column — Chat */}
            <div style={{ position: "sticky", top: "96px" }}>
              <ChatUI />
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            padding: "28px 24px",
          }}
        >
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px", height: "28px", borderRadius: "6px",
                  background: "#1d4ed8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Vote size={14} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                Chunav Saathi
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                · Powered by Gemini AI · ECI Awareness Platform
              </span>
            </div>
            <div
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontSize: "0.8rem", color: "var(--text-secondary)",
              }}
            >
              <Phone size={13} />
              Voter Helpline: <strong style={{ color: "var(--text-primary)" }}>1950</strong>
              <span style={{ margin: "0 4px", color: "var(--border-strong)" }}>·</span>
              voters.eci.gov.in
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
