"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Shield, MapPin, Phone, CreditCard, Clock,
  FileText, Loader2, LogOut, Edit, Save, X,
} from "lucide-react";

export default function ProfilePage() {
  const { loggedInUser, authFetch, logout, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [complaintStats, setComplaintStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !loggedInUser) router.push("/");
  }, [authLoading, loggedInUser, router]);

  // Fetch user's complaint stats
  useEffect(() => {
    if (!loggedInUser) return;
    const fetchStats = async () => {
      try {
        const res = await authFetch("/api/complaints?limit=1");
        const data = await res.json();
        const total = data.pagination?.total || 0;

        const resPending = await authFetch("/api/complaints?status=Pending&limit=1");
        const dataPending = await resPending.json();
        const pending = dataPending.pagination?.total || 0;

        const resResolved = await authFetch("/api/complaints?status=Resolved&limit=1");
        const dataResolved = await resResolved.json();
        const resolved = dataResolved.pagination?.total || 0;

        setComplaintStats({ total, pending, resolved });
      } catch {}
      setLoading(false);
    };
    fetchStats();
  }, [loggedInUser, authFetch]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (authLoading || !loggedInUser) {
    return (
      <div style={{ paddingTop: "120px", textAlign: "center", color: "var(--text-muted)" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "88px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "28px 20px 64px" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div className="section-label" style={{ marginBottom: "10px" }}>
            <User size={11} />
            {t.profileTitle}
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>{t.profileTitle}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{t.profileSubtitle}</p>
        </div>

        {/* Profile Card */}
        <div className="card" style={{ padding: "0", borderRadius: "16px", overflow: "hidden", marginBottom: "20px" }}>
          {/* Profile Header */}
          <div className="eci-stripe" style={{ padding: "28px 28px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%",
                background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem", fontWeight: 800, color: "white",
              }}>
                {loggedInUser.name?.charAt(0)?.toUpperCase() || "C"}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "white" }}>
                  {loggedInUser.name}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                  <span style={{
                    padding: "2px 10px", borderRadius: "4px",
                    background: loggedInUser.role === "admin" ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.2)",
                    color: "white", fontSize: "0.72rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {loggedInUser.role === "admin" ? t.admin : t.citizen}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem" }}>
                    · Verified Citizen
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div style={{ padding: "24px 28px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              {[
                { icon: Phone, label: t.phoneNumber, value: loggedInUser.phone || "Not set" },
                { icon: MapPin, label: t.state, value: loggedInUser.state || "Not set" },
                { icon: MapPin, label: t.district, value: loggedInUser.district || "Not set" },
                { icon: MapPin, label: t.constituency, value: loggedInUser.constituency || "Not set" },
                { icon: CreditCard, label: t.epicNumber, value: loggedInUser.epicNumber || "Not linked", mono: true },
                { icon: Shield, label: t.profileRole, value: loggedInUser.role === "admin" ? t.admin : t.citizen },
              ].map(({ icon: Icon, label, value, mono }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "8px",
                    background: "var(--primary-light)", display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={16} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)",
                      fontFamily: mono ? "monospace" : "inherit",
                    }}>
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: t.analyticsTotal, value: complaintStats.total, color: "#ea580c" },
            { label: t.analyticsPending, value: complaintStats.pending, color: "#f59e0b" },
            { label: t.analyticsResolved, value: complaintStats.resolved, color: "#10b981" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: "18px", borderRadius: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color, lineHeight: 1 }}>{loading ? "—" : value}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: "6px" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="card" style={{ padding: "24px", borderRadius: "14px" }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "16px" }}>
            Account Actions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={handleLogout}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "12px 16px", borderRadius: "8px",
                border: "1px solid #ef4444", background: "transparent",
                color: "#ef4444", fontWeight: 600, fontSize: "0.88rem",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <LogOut size={16} />
              {t.navLogout}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
