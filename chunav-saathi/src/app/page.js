"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ElectionTimeline } from "@/components/ElectionTimeline";
import { EciActionHub } from "@/components/EciActionHub";
import { VoterDashboard } from "@/components/VoterDashboard";
import { ChatSidebar } from "@/components/ChatUI";
import { KarnatakaToast } from "@/components/KarnatakaToast";
import { Vote, Phone, BarChart3, LayoutDashboard, ArrowRight } from "lucide-react";
import Link from "next/link";

const stats = [
  { value: "—", label: "Registered electors" },
  { value: "—", label: "Polling parts" },
  { value: "—", label: "Recorded turnout" },
  { value: "—", label: "Roll year" },
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

          <div className="home-hero-grid">
            <div>
              <h1 className="home-hero-title">{t.heroTitle}</h1>
              <p className="home-hero-copy">{t.heroSub}</p>

              <div className="home-stat-grid" aria-label="Verified election data status">
                {stats.map((stat) => (
                  <div key={stat.label} className="home-stat-cell">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
              <p className="home-stat-source">Source/year unavailable: no verified electoral dataset has been imported.</p>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
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
                  <Link href="/analytics" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                    <BarChart3 size={16} /> Explore analytics <ArrowRight size={14} />
                  </Link>
              )}
              </div>
            </div>

            <div className="home-hero-chat"><ChatSidebar compact /></div>
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
            <div id="dashboard-grid" className="home-dashboard-grid">
              <VoterDashboard />
              <div className="flex min-w-0 flex-col gap-6">
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
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Vote size={13} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>Chunav Saathi</span>
              <span className="home-footer-disclaimer">Independent student project · Not affiliated with ECI</span>
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
