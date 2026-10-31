"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  UserCheck,
  Megaphone,
  Vote,
  BarChart3,
  Clock,
} from "lucide-react";

const phases = [
  {
    key: "phase1",
    descKey: "phase1desc",
    icon: UserCheck,
    accentColor: "var(--primary)",
    step: "01",
  },
  {
    key: "phase2",
    descKey: "phase2desc",
    icon: Megaphone,
    accentColor: "var(--primary)",
    step: "02",
  },
  {
    key: "phase3",
    descKey: "phase3desc",
    icon: Vote,
    accentColor: "var(--primary)",
    step: "03",
  },
  {
    key: "phase4",
    descKey: "phase4desc",
    icon: BarChart3,
    accentColor: "var(--primary)",
    step: "04",
  },
];

export function ElectionTimeline() {
  const { t } = useLanguage();

  return (
    <div className="card" style={{ padding: "24px", borderRadius: "8px" }}>
      <div style={{ marginBottom: "20px" }}>
        <div className="section-label">
          <Clock size={11} />
          {t.timelineTitle}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          const isLast = idx === phases.length - 1;

          return (
            <div
              key={phase.key}
              id={`timeline-phase-${idx + 1}`}
              style={{ display: "flex", gap: "0" }}
            >
              {/* Step indicator column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: "16px" }}>
                {/* Circle */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: `2px solid ${phase.accentColor}`,
                    background: "var(--primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                    boxShadow: "none",
                  }}
                >
                  <Icon size={18} color="var(--primary-text)" />
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    style={{
                      width: "3px",
                      flex: 1,
                      minHeight: "28px",
                      background: "var(--border-strong)",
                      margin: "4px 0",
                      transition: "background 0.3s ease",
                      borderRadius: "2px",
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  paddingBottom: isLast ? "0" : "20px",
                  paddingTop: "6px",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary-text)" }}>{phase.step}</span>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{t[phase.key]}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    {t[phase.descKey]}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
