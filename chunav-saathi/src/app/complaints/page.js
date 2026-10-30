"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Plus, Search, Filter, Loader2, AlertCircle,
  ChevronDown, ChevronLeft, ChevronRight, Eye,
} from "lucide-react";

const STATUS_COLORS = { Pending: "#f59e0b", "In Progress": "#3b82f6", Resolved: "#10b981", Rejected: "#ef4444" };
const PRIORITY_COLORS = { Low: "#64748b", Medium: "#f59e0b", High: "#ef4444" };

export default function ComplaintsPage() {
  const { loggedInUser, authFetch, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    if (!authLoading && !loggedInUser) router.push("/");
  }, [authLoading, loggedInUser, router]);

  const fetchComplaints = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterCategory !== "all") params.set("category", filterCategory);

      const res = await authFetch(`/api/complaints?${params}`);
      const data = await res.json();
      setComplaints(data.complaints || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (loggedInUser) fetchComplaints();
  }, [loggedInUser]);

  const handleSearch = () => fetchComplaints(1);
  const handleFilter = () => fetchComplaints(1);

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
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "28px 20px 64px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div className="section-label" style={{ marginBottom: "10px" }}>
              <FileText size={11} />
              {t.complaintsTitle}
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>{t.complaintsTitle}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{t.complaintsSubtitle}</p>
          </div>
          <Link href="/complaints/new" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={15} /> {t.complaintNew}
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="card" style={{ padding: "16px", borderRadius: "12px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
              <input
                type="text"
                placeholder={t.complaintSearch}
                className="civic-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                style={{ paddingLeft: "36px" }}
              />
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            </div>
            <div style={{ position: "relative" }}>
              <select
                className="civic-input"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); }}
                style={{ appearance: "none", paddingRight: "28px", cursor: "pointer", minWidth: "130px" }}
              >
                <option value="all">{t.analyticsFilterAll} Status</option>
                <option value="Pending">{t.pending}</option>
                <option value="In Progress">{t.inProgress}</option>
                <option value="Resolved">{t.resolved}</option>
                <option value="Rejected">{t.rejected}</option>
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            </div>
            <button className="btn-primary" onClick={handleFilter} style={{ padding: "10px 18px" }}>
              <Filter size={14} /> {t.search}
            </button>
          </div>
        </div>

        {/* Complaints List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : complaints.length === 0 ? (
          <div className="card" style={{
            textAlign: "center", padding: "48px 24px", borderRadius: "14px",
          }}>
            <FileText size={36} color="var(--text-muted)" style={{ marginBottom: "12px" }} />
            <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "16px" }}>{t.complaintNoResults}</div>
            <Link href="/complaints/new" className="btn-primary" style={{ display: "inline-flex" }}>
              <Plus size={14} /> {t.complaintNew}
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {complaints.map((c) => (
              <div
                key={c.complaintId || c._id}
                className="card fade-in-up"
                style={{ padding: "18px 20px", borderRadius: "12px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "4px" }}>
                      {c.subject}
                    </div>
                    <div style={{ display: "flex", gap: "8px", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace" }}>{c.complaintId}</span>
                      <span>·</span>
                      <span>{c.category}</span>
                      <span>·</span>
                      <span>{c.state}, {c.district}</span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700,
                      color: PRIORITY_COLORS[c.priority] || "var(--text-secondary)",
                      background: `${PRIORITY_COLORS[c.priority] || "#888"}15`,
                      textTransform: "uppercase",
                    }}>{c.priority}</span>
                    <span style={{
                      padding: "3px 10px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700,
                      color: STATUS_COLORS[c.status] || "var(--text-secondary)",
                      background: `${STATUS_COLORS[c.status] || "#888"}15`,
                      textTransform: "uppercase",
                    }}>{c.status}</span>
                  </div>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {c.description?.substring(0, 150)}{c.description?.length > 150 ? "..." : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "24px" }}>
            <button
              className="btn-outline"
              disabled={pagination.page <= 1}
              onClick={() => fetchComplaints(pagination.page - 1)}
              style={{ padding: "8px 12px", opacity: pagination.page <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <button
              className="btn-outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchComplaints(pagination.page + 1)}
              style={{ padding: "8px 12px", opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
