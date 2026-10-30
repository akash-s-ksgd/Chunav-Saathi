"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatSidebar } from "@/components/ChatUI";
import Link from "next/link";
import {
  LayoutDashboard, FileText, BarChart3, MapPin, Search,
  Clock, AlertCircle, CheckCircle2, Loader2, ArrowRight,
  Shield, Plus, ChevronDown,
} from "lucide-react";

export default function DashboardPage() {
  const { loggedInUser, authFetch, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [complaints, setComplaints] = useState([]);
  const [boothResults, setBoothResults] = useState([]);
  const [boothSearch, setBoothSearch] = useState("");
  const [boothState, setBoothState] = useState("");
  const [boothStates, setBoothStates] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [searchingBooths, setSearchingBooths] = useState(false);

  useEffect(() => {
    if (!authLoading && !loggedInUser) {
      router.push("/");
    }
  }, [authLoading, loggedInUser, router]);

  // Fetch user's complaints
  useEffect(() => {
    if (!loggedInUser) return;
    const fetchComplaints = async () => {
      try {
        const res = await authFetch("/api/complaints?limit=5");
        const data = await res.json();
        setComplaints(data.complaints || []);
      } catch {
        // ignore
      }
      setLoadingComplaints(false);
    };
    fetchComplaints();
  }, [loggedInUser, authFetch]);

  // Fetch booth states
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await fetch("/api/booths?limit=1");
        const data = await res.json();
        setBoothStates(data.states || []);
      } catch {}
    };
    fetchStates();
  }, []);

  const handleBoothSearch = async () => {
    if (!boothSearch && !boothState) return;
    setSearchingBooths(true);
    try {
      const params = new URLSearchParams();
      if (boothSearch) params.set("search", boothSearch);
      if (boothState) params.set("state", boothState);
      params.set("limit", "5");
      const res = await fetch(`/api/booths?${params}`);
      const data = await res.json();
      setBoothResults(data.booths || []);
    } catch {}
    setSearchingBooths(false);
  };

  const statusColor = {
    "Pending": "#f59e0b",
    "In Progress": "#3b82f6",
    "Resolved": "#10b981",
    "Rejected": "#ef4444",
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
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 20px 64px" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div className="section-label" style={{ marginBottom: "10px" }}>
            <LayoutDashboard size={11} />
            {t.dashTitle}
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>
            {t.dashWelcome}, {loggedInUser.name} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {loggedInUser.state && `${loggedInUser.district || ""}, ${loggedInUser.state}`}
            {loggedInUser.role === "admin" && (
              <span style={{
                background: "var(--primary)", color: "white",
                padding: "2px 8px", borderRadius: "4px",
                fontSize: "0.7rem", fontWeight: 700, marginLeft: "8px",
              }}>
                {t.admin}
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Quick Actions */}
            <div className="card" style={{ padding: "22px", borderRadius: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "16px" }}>
                {t.dashQuickActions}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { href: "/complaints/new", Icon: Plus, label: t.dashFileComplaint, color: "#ea580c", bg: "#fff7ed" },
                  { href: "/analytics", Icon: BarChart3, label: t.dashViewAnalytics, color: "#7c3aed", bg: "#f5f3ff" },
                  { href: "#booth-search", Icon: MapPin, label: t.dashFindBooth, color: "#16a34a", bg: "#f0fdf4" },
                ].map(({ href, Icon, label, color, bg }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: "8px", padding: "16px 8px", borderRadius: "10px",
                      border: "1px solid var(--border)", textDecoration: "none",
                      transition: "all 0.15s", textAlign: "center",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = bg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} color={color} />
                    </div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: "1.3" }}>{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Complaints */}
            <div className="card" style={{ padding: "22px", borderRadius: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  {t.dashMyComplaints}
                </div>
                <Link href="/complaints" style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                  View All <ArrowRight size={12} />
                </Link>
              </div>

              {loadingComplaints ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                  <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : complaints.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "24px",
                  background: "var(--muted-bg)", borderRadius: "10px",
                  border: "1px dashed var(--border-strong)",
                }}>
                  <FileText size={24} color="var(--text-muted)" style={{ marginBottom: "8px" }} />
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t.dashNoComplaints}</div>
                  <Link href="/complaints/new" className="btn-primary" style={{ marginTop: "12px", fontSize: "0.8rem", padding: "8px 18px" }}>
                    <Plus size={14} /> {t.dashFileComplaint}
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {complaints.map((c) => (
                    <div
                      key={c.complaintId}
                      style={{
                        padding: "12px 14px", borderRadius: "8px",
                        border: "1px solid var(--border)", background: "var(--surface)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "3px" }}>
                          {c.subject?.substring(0, 45)}{c.subject?.length > 45 ? "..." : ""}
                        </div>
                        <div style={{ display: "flex", gap: "8px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          <span>{c.complaintId}</span>
                          <span>·</span>
                          <span>{c.category}</span>
                        </div>
                      </div>
                      <span style={{
                        padding: "3px 10px", borderRadius: "4px",
                        fontSize: "0.68rem", fontWeight: 700,
                        color: statusColor[c.status] || "var(--text-secondary)",
                        background: `${statusColor[c.status]}15` || "var(--muted-bg)",
                        textTransform: "uppercase",
                      }}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Booth Search */}
            <div id="booth-search" className="card" style={{ padding: "22px", borderRadius: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <MapPin size={16} color="var(--primary)" /> {t.dashFindBooth}
              </div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: "0 0 auto", minWidth: "140px" }}>
                  <select
                    id="booth-state-select"
                    className="civic-input"
                    value={boothState}
                    onChange={(e) => setBoothState(e.target.value)}
                    style={{ appearance: "none", paddingRight: "28px", cursor: "pointer" }}
                  >
                    <option value="">{t.selectState}</option>
                    {boothStates.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                </div>
                <input
                  type="text"
                  placeholder={t.search + "..."}
                  className="civic-input"
                  value={boothSearch}
                  onChange={(e) => setBoothSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleBoothSearch(); }}
                  style={{ flex: 1, minWidth: "120px" }}
                />
                <button className="btn-primary" onClick={handleBoothSearch} disabled={searchingBooths} style={{ padding: "10px 16px" }}>
                  {searchingBooths ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={15} />}
                </button>
              </div>
              {boothResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {boothResults.map((b) => (
                    <div key={b.boothId} className="fade-in-up" style={{
                      padding: "12px 14px", borderRadius: "8px",
                      border: "1px solid var(--border)", background: "var(--muted-bg)",
                    }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "4px" }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <span>📍 {b.constituency}, {b.district}</span>
                        <span>·</span>
                        <span>Booth #{b.boothNumber}</span>
                        <span>·</span>
                        <span>Capacity: {b.capacity}</span>
                        {b.isAccessible && <span style={{ color: "var(--success)" }}>♿ Accessible</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Chat */}
          <div style={{ height: "75vh", position: "sticky", top: "96px" }}>
            <ChatSidebar />
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
