"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Search, FileText, User, Smartphone, ArrowUpRight, LayoutGrid } from "lucide-react";

const actions = [
  {
    labelKey: "searchRoll",
    descKey: "searchRollDesc",
    icon: Search,
    accentColor: "#1d4ed8",
    accentBg: "#eff6ff",
    href: "https://electoralsearch.eci.gov.in/",
    id: "action-search-roll",
  },
  {
    labelKey: "registerVote",
    descKey: "registerVoteDesc",
    icon: FileText,
    accentColor: "#ea580c",
    accentBg: "#fff7ed",
    href: "https://voters.eci.gov.in/",
    id: "action-register-vote",
  },
  {
    labelKey: "knowCandidate",
    descKey: "knowCandidateDesc",
    icon: User,
    accentColor: "#16a34a",
    accentBg: "#f0fdf4",
    href: "https://affidavit.eci.gov.in/",
    id: "action-know-candidate",
  },
  {
    labelKey: "downloadApp",
    descKey: "downloadAppDesc",
    icon: Smartphone,
    accentColor: "#7c3aed",
    accentBg: "#f5f3ff",
    href: "https://play.google.com/store/apps/details?id=com.eci.citizen",
    id: "action-download-app",
  },
];

export function EciActionHub() {
  const { t } = useLanguage();

  return (
    <div className="card" style={{ padding: "24px", borderRadius: "12px" }}>
      <div style={{ marginBottom: "18px" }}>
        <div className="section-label">
          <LayoutGrid size={11} />
          {t.hubTitle}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <a
              key={action.id}
              id={action.id}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.18s ease",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = action.accentColor;
                e.currentTarget.style.background = action.accentBg;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 4px 16px ${action.accentColor}18`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--surface)";
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  background: action.accentBg,
                  border: `1px solid ${action.accentColor}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={18} color={action.accentColor} />
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    color: "var(--text-primary)",
                    marginBottom: "3px",
                    lineHeight: "1.3",
                  }}
                >
                  {t[action.labelKey]}
                </div>
                <div
                  style={{
                    fontSize: "0.71rem",
                    color: "var(--text-secondary)",
                    lineHeight: "1.4",
                  }}
                >
                  {t[action.descKey]}
                </div>
              </div>

              {/* Link arrow */}
              <ArrowUpRight
                size={13}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  color: action.accentColor,
                  opacity: 0.5,
                }}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
