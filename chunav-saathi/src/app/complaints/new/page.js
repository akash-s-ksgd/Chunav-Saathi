"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, ChevronDown, Loader2, CheckCircle2,
  AlertCircle, ArrowLeft, Send,
} from "lucide-react";

const CATEGORIES = [
  "Booth Accessibility", "Booth Distance", "Staff Behavior",
  "EVM Malfunction", "Queue Management", "Voter ID Issues",
  "Misinformation", "Infrastructure", "Transportation", "Other",
];

const STATES_DATA = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kurnool"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
  "Karnataka": ["Bengaluru Urban", "Mysuru", "Mangaluru", "Hubli-Dharwad", "Belagavi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  "Uttar Pradesh": ["Lucknow", "Varanasi", "Agra", "Kanpur", "Prayagraj"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"],
};

export default function NewComplaintPage() {
  const { loggedInUser, authFetch, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [resultId, setResultId] = useState("");

  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [constituency, setConstituency] = useState("");
  const [priority, setPriority] = useState("");

  useEffect(() => {
    if (!authLoading && !loggedInUser) router.push("/");
  }, [authLoading, loggedInUser, router]);

  // Pre-fill state/district from user profile
  useEffect(() => {
    if (loggedInUser) {
      if (loggedInUser.state) setState(loggedInUser.state);
      if (loggedInUser.district) setDistrict(loggedInUser.district);
    }
  }, [loggedInUser]);

  const validate = () => {
    const errors = {};
    if (!category) errors.category = "Category is required";
    if (!subject || subject.trim().length < 10) errors.subject = "Subject must be at least 10 characters";
    if (!description || description.trim().length < 30) errors.description = "Description must be at least 30 characters";
    if (!state) errors.state = "State is required";
    if (!district) errors.district = "District is required";
    if (!priority) errors.priority = "Priority is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await authFetch("/api/complaints", {
        method: "POST",
        body: JSON.stringify({ category, subject: subject.trim(), description: description.trim(), state, district, constituency, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit complaint");
      }
      setResultId(data.complaint?.complaintId || "");
      setIsSuccess(true);
    } catch (err) {
      setErrorMsg(err.message);
    }
    setIsSubmitting(false);
  };

  const inputStyle = (hasError) => ({
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    border: `1.5px solid ${hasError ? "#ef4444" : "var(--border-strong)"}`,
    background: "var(--surface)", color: "var(--text-primary)",
    fontSize: "0.9rem", fontFamily: "inherit", outline: "none",
    transition: "border-color 0.15s ease",
  });

  const labelStyle = {
    display: "block", fontSize: "0.78rem", fontWeight: 600,
    color: "var(--text-secondary)", marginBottom: "5px",
  };

  const errorStyle = { fontSize: "0.72rem", color: "#ef4444", marginTop: "3px" };
  const districts = state ? STATES_DATA[state] || [] : [];

  if (authLoading || !loggedInUser) {
    return (
      <div style={{ paddingTop: "120px", textAlign: "center", color: "var(--text-muted)" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div style={{ paddingTop: "88px" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
          <div className="fade-in-up card" style={{ padding: "40px 30px", borderRadius: "16px" }}>
            <div style={{
              width: "70px", height: "70px", borderRadius: "50%",
              background: "var(--success-light)", border: "2px solid var(--success)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <CheckCircle2 size={34} color="var(--success)" />
            </div>
            <h2 style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--text-primary)", marginBottom: "8px" }}>
              {t.complaintSuccess}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "6px" }}>
              {t.complaintId}: <strong style={{ fontFamily: "monospace", color: "var(--primary)" }}>{resultId}</strong>
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "24px" }}>
              You can track the status of your complaint in your dashboard.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <Link href="/complaints" className="btn-outline" style={{ display: "inline-flex" }}>
                View Complaints
              </Link>
              <Link href="/dashboard" className="btn-primary" style={{ display: "inline-flex" }}>
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "88px" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "28px 20px 64px" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <Link href="/complaints" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--primary)", fontWeight: 600, textDecoration: "none", marginBottom: "12px" }}>
            <ArrowLeft size={14} /> Back to Complaints
          </Link>
          <div className="section-label" style={{ marginBottom: "10px" }}>
            <FileText size={11} />
            {t.complaintNew}
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>{t.complaintNew}</h1>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{
            display: "flex", gap: "8px", alignItems: "flex-start",
            padding: "10px 14px", borderRadius: "8px",
            background: "#fef2f2", border: "1px solid #fca5a5",
            marginBottom: "16px",
          }}>
            <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
            <span style={{ fontSize: "0.8rem", color: "#dc2626" }}>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <div className="card" style={{ padding: "28px", borderRadius: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Category */}
            <div>
              <label style={labelStyle}>{t.complaintCategory} *</label>
              <div style={{ position: "relative" }}>
                <select
                  id="complaint-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ ...inputStyle(fieldErrors.category), appearance: "none", paddingRight: "28px", cursor: "pointer" }}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
              {fieldErrors.category && <div style={errorStyle}>{fieldErrors.category}</div>}
            </div>

            {/* Subject */}
            <div>
              <label style={labelStyle}>{t.complaintSubject} * <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(10-100 chars)</span></label>
              <input
                id="complaint-subject"
                type="text"
                maxLength={100}
                placeholder="Brief description of the issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={inputStyle(fieldErrors.subject)}
              />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {fieldErrors.subject && <div style={errorStyle}>{fieldErrors.subject}</div>}
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", marginLeft: "auto" }}>{subject.length}/100</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>{t.complaintDesc} * <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(30-500 chars)</span></label>
              <textarea
                id="complaint-description"
                maxLength={500}
                rows={4}
                placeholder="Provide detailed description of the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle(fieldErrors.description), resize: "vertical", lineHeight: "1.6" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {fieldErrors.description && <div style={errorStyle}>{fieldErrors.description}</div>}
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px", marginLeft: "auto" }}>{description.length}/500</div>
              </div>
            </div>

            {/* State & District */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>{t.complaintState} *</label>
                <div style={{ position: "relative" }}>
                  <select
                    id="complaint-state"
                    value={state}
                    onChange={(e) => { setState(e.target.value); setDistrict(""); }}
                    style={{ ...inputStyle(fieldErrors.state), appearance: "none", paddingRight: "28px", cursor: "pointer" }}
                  >
                    <option value="">{t.selectState}</option>
                    {Object.keys(STATES_DATA).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                </div>
                {fieldErrors.state && <div style={errorStyle}>{fieldErrors.state}</div>}
              </div>
              <div>
                <label style={labelStyle}>{t.complaintDistrict} *</label>
                <div style={{ position: "relative" }}>
                  <select
                    id="complaint-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={!state}
                    style={{ ...inputStyle(fieldErrors.district), appearance: "none", paddingRight: "28px", cursor: "pointer" }}
                  >
                    <option value="">{t.selectDistrict}</option>
                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                </div>
                {fieldErrors.district && <div style={errorStyle}>{fieldErrors.district}</div>}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label style={labelStyle}>{t.complaintPriority} *</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: "Low", color: "#64748b", bg: "#f1f5f9" },
                  { value: "Medium", color: "#f59e0b", bg: "#fffbeb" },
                  { value: "High", color: "#ef4444", bg: "#fef2f2" },
                ].map(({ value, color, bg }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriority(value)}
                    style={{
                      flex: 1, padding: "10px 16px", borderRadius: "8px",
                      border: priority === value ? `2px solid ${color}` : "2px solid var(--border)",
                      background: priority === value ? bg : "transparent",
                      color: priority === value ? color : "var(--text-secondary)",
                      fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                      fontFamily: "inherit", transition: "all 0.15s",
                    }}
                  >
                    {t[value.toLowerCase()] || value}
                  </button>
                ))}
              </div>
              {fieldErrors.priority && <div style={errorStyle}>{fieldErrors.priority}</div>}
            </div>

            {/* Submit */}
            <button
              id="submit-complaint-btn"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "0.95rem", marginTop: "8px", opacity: isSubmitting ? 0.65 : 1 }}
            >
              {isSubmitting ? (
                <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
              ) : (
                <><Send size={16} /> {t.complaintSubmit}</>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
