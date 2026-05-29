"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  UserCheck,
  Megaphone,
  Vote,
  BarChart3,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useState } from "react";

const phases = [
  {
    key: "phase1",
    descKey: "phase1desc",
    icon: UserCheck,
    accentColor: "#1d4ed8",
    accentBg: "#eff6ff",
    status: "completed",
    step: "01",
  },
  {
    key: "phase2",
    descKey: "phase2desc",
    icon: Megaphone,
    accentColor: "#ea580c",
    accentBg: "#fff7ed",
    status: "active",
    step: "02",
  },
  {
    key: "phase3",
    descKey: "phase3desc",
    icon: Vote,
    accentColor: "#16a34a",
    accentBg: "#f0fdf4",
    status: "upcoming",
    step: "03",
  },
  {
    key: "phase4",
    descKey: "phase4desc",
    icon: BarChart3,
    accentColor: "#7c3aed",
    accentBg: "#f5f3ff",
    status: "upcoming",
    step: "04",
  },
];

const statusBadge = {
  completed: { label: "Completed", color: "#16a34a", bg: "#f0fdf4" },
  active:    { label: "In Progress", color: "#ea580c", bg: "#fff7ed" },
  upcoming:  { label: "Upcoming",   color: "#64748b", bg: "#f1f5f9" },
};

export function ElectionTimeline() {
  const { t } = useLanguage();
  const [activePhase, setActivePhase] = useState(1);

  return (
    <div className="card" style={{ padding: "24px", borderRadius: "12px" }}>
      <div style={{ marginBottom: "20px" }}>
        <div className="section-label">
          <Clock size={11} />
          {t.timelineTitle}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          const isActive = idx === activePhase;
          const isDone = idx < activePhase;
          const badge = statusBadge[phase.status];
          const isLast = idx === phases.length - 1;

          return (
            <div
              key={phase.key}
              id={`timeline-phase-${idx + 1}`}
              style={{ display: "flex", gap: "0", cursor: "pointer" }}
              onClick={() => setActivePhase(idx)}
            >
              {/* Step indicator column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: "16px" }}>
                {/* Circle */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: `2px solid ${isActive || isDone ? phase.accentColor : "var(--border-strong)"}`,
                    background: isDone
                      ? phase.accentColor
                      : isActive
                        ? phase.accentBg
                        : "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? `0 0 0 4px ${phase.accentColor}18` : "none",
                  }}
                >
                  {isDone
                    ? <CheckCircle2 size={18} color="white" />
                    : <Icon size={18} color={isActive ? phase.accentColor : "var(--text-muted)"} />
                  }
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    style={{
                      width: "2px",
                      flex: 1,
                      minHeight: "24px",
                      background: isDone ? phase.accentColor : "var(--border)",
                      margin: "4px 0",
                      transition: "background 0.3s ease",
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
                    border: isActive ? `1px solid ${phase.accentColor}40` : "1px solid transparent",
                    background: isActive ? phase.accentBg : "transparent",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: isActive ? phase.accentColor : "var(--text-primary)",
                      }}
                    >
                      {t[phase.key]}
                    </div>
                    {/* Status badge */}
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: badge.bg,
                        color: badge.color,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        marginLeft: "8px",
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
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
