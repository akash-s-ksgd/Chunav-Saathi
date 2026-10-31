"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ElectionTimeline } from "@/components/ElectionTimeline";
import { EciActionHub } from "@/components/EciActionHub";
import { VoterDashboard } from "@/components/VoterDashboard";
import { ChatSidebar, ChatFloating } from "@/components/ChatUI";
import { KarnatakaToast } from "@/components/KarnatakaToast";
import { Vote, Shield, Phone, BarChart3, LayoutDashboard, ArrowRight } from "lucide-react";
import Link from "next/link";

const stats = [
  { value: "97 Cr+",  label: "Registered Voters",  id: "stat-voters" },
  { value: "1950",    label: "Voter Helpline",       id: "stat-helpline" },
  { value: "Form 6",  label: "New Registration",     id: "stat-form6" },
  { value: "543",     label: "Lok Sabha Seats",       id: "stat-seats" },
];

export default function HomePage() {
  const { t } = useLanguage();
  const { loggedInUser } = useAuth();

  return (
    <>
      <KarnatakaToast />

      <div style={{ paddingTop: "88px" }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section style={{ position: "relative", background: "var(--navy)", borderBottom: "1px solid var(--border)", overflow: "hidden" }}>
          {/* Ashoka Chakra SVG Watermark */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] flex items-center justify-center overflow-hidden z-0">
            <svg width="600" height="600" viewBox="0 0 200 200" fill="none" stroke="currentColor" className="text-orange-500 animate-spin-slow">
              <circle cx="100" cy="100" r="80" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="100" cy="100" r="40" strokeWidth="1" />
              {[...Array(24)].map((_, i) => (
                <line
                  key={i}
                  x1="100"
                  y1="100"
                  x2={(100 + 80 * Math.cos((i * 15 * Math.PI) / 180)).toFixed(4)}
                  y2={(100 + 80 * Math.sin((i * 15 * Math.PI) / 180)).toFixed(4)}
                  strokeWidth="0.5"
                />
              ))}
            </svg>
          </div>

          <div style={{ position: "relative", zIndex: 10, maxWidth: "1280px", margin: "0 auto", padding: "54px 20px 48px" }}>
            <div className="section-label" style={{ marginBottom: "16px", background: "rgba(255,255,255,0.1)", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.2)" }}>
              <Shield size={12} />
              Independent student project · Not affiliated with ECI
            </div>

            <h1 style={{
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.02em",
              color: "#ffffff", marginBottom: "16px", maxWidth: "720px",
            }}>
              {t.heroTitle}
            </h1>

            <p style={{
              fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
              color: "#cbd5e1", maxWidth: "600px",
              lineHeight: 1.7, marginBottom: "38px",
            }}>
              {t.heroSub}
            </p>

            {/* Stats grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "1px", background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", /* rounded-2xl */
              overflow: "hidden", maxWidth: "660px",
              backdropFilter: "blur(8px)",
            }}>
              {stats.map(s => (
                <div key={s.id} id={s.id} style={{ background: "var(--navy-light)", padding: "18px 20px", textAlign: "center" }}>
                  <div className="stat-value" style={{ color: "var(--primary)" }}>{s.value}</div>
                  <div className="stat-label" style={{ color: "#94a3b8" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: "12px", marginTop: "28px", flexWrap: "wrap" }}>
              {loggedInUser ? (
                <>
                  <Link href="/dashboard" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                    <LayoutDashboard size={16} /> {t.navDashboard} <ArrowRight size={14} />
                  </Link>
                  <Link href="/analytics" className="btn-outline" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", borderColor: "rgba(255,255,255,0.3)", color: "#f8fafc" }}>
                    <BarChart3 size={16} /> {t.navAnalytics}
                  </Link>
                </>
              ) : (
                <div style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: "0.85rem" }}>
                  Login to access Dashboard, Analytics, and file Complaints
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Main dashboard ────────────────────────────────────────── */}
        <section style={{ background: "var(--background)" }}>
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              padding: "28px 20px 64px",
            }}
          >
            {/*
              Mobile: flex column, Chat is first.
              Desktop: flex row, Chat is left (60%), Dashboard is right (40%).
            */}
            <div
              id="dashboard-grid"
              className="flex flex-col md:flex-row gap-6 items-start"
            >
              {/* ── Left column: Chat Assistant (60% on desktop, 55vh on mobile) ── */}
              <div
                id="left-col"
                className="w-full md:w-[60%] h-[55vh] md:h-[75vh] md:sticky md:top-[96px] order-1 flex flex-col"
              >
                <ChatSidebar />
              </div>

              {/* ── Right column: Voter Dashboard + Timeline + Cards (40% on desktop) ── */}
              <div
                id="right-col"
                className="flex flex-col gap-6 w-full md:w-[40%] order-2"
                style={{ minWidth: 0 }}
              >
                <VoterDashboard />
                <ElectionTimeline />
                <EciActionHub />
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "24px 20px" }}>
          <div style={{
            maxWidth: "1280px", margin: "0 auto",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Vote size={13} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>Chunav Saathi</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>· Groq AI · Independent civic information</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              <Phone size={12} />
              Voter Helpline: <strong style={{ color: "var(--text-primary)" }}>1950</strong>
              <span style={{ margin: "0 3px", color: "var(--border-strong)" }}>·</span>
              voters.eci.gov.in
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
