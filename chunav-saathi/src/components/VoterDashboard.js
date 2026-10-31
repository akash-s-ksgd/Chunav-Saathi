"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { MapPin, Search, User, AlertCircle, Info } from "lucide-react";

// Mock Database
const MOCK_DB = {
  KA01: {
    state: "Karnataka",
    constituency: "Bengaluru Central",
    date: "May 10, 2024",
    status: "Completed",
    parties: ["Party A", "Party B", "Party C"],
  },
  DL02: {
    state: "Delhi",
    constituency: "New Delhi",
    date: "May 25, 2024",
    status: "Upcoming",
    parties: ["Party X", "Party Y", "Party Z"],
  },
  MH03: {
    state: "Maharashtra",
    constituency: "Mumbai South",
    date: "May 20, 2024",
    status: "In Progress",
    parties: ["Party M", "Party N", "Party O"],
  },
};

export function VoterDashboard() {
  const { loggedInUser } = useAuth();
  const [epicInput, setEpicInput] = useState("");
  const [searchedProfile, setSearchedProfile] = useState(null);
  const registeredProfile = loggedInUser?.method === "epic" && loggedInUser.epicNumber
    ? MOCK_DB[loggedInUser.epicNumber.substring(0, 4).toUpperCase()]
      ? { epic: loggedInUser.epicNumber, ...MOCK_DB[loggedInUser.epicNumber.substring(0, 4).toUpperCase()] }
      : null
    : null;
  const activeProfile = registeredProfile || searchedProfile;
  
  // Search State
  const [searchState, setSearchState] = useState("");
  const [searchConst, setSearchConst] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  const handleEpicSubmit = () => {
    if (!epicInput) return;
    const prefix = epicInput.substring(0, 4).toUpperCase();
    if (MOCK_DB[prefix]) {
      setSearchedProfile({ epic: epicInput.toUpperCase(), ...MOCK_DB[prefix] });
    } else {
      alert("EPIC prefix not found in Mock DB (Try KA01, DL02, MH03)");
    }
  };

  const handleSearch = () => {
    if (!searchState || !searchConst) return;
    // For demo purposes, simply create a mock result
    setSearchResult({
      state: searchState,
      constituency: searchConst,
      date: "Phase 4 - May 13, 2024",
      status: "Upcoming",
      parties: ["Major Party 1", "Major Party 2", "Independent"],
    });
  };

  const renderStatus = (status) => {
    const colors = {
      "Completed": "var(--success)",
      "In Progress": "var(--primary)",
      "Upcoming": "var(--text-secondary)"
    };
    return (
      <span style={{ color: colors[status] || "var(--text-primary)", fontWeight: 700 }}>
        {status}
      </span>
    );
  };

  return (
    <div className="card" style={{ padding: "24px", borderRadius: "16px", marginBottom: "22px" }}>
      <div style={{ marginBottom: "18px" }}>
        <div className="section-label">
          <User size={11} />
          Voter Profile & Local Status
        </div>
      </div>

      {activeProfile ? (
        <div style={{ background: "var(--navy-light)", borderRadius: "12px", padding: "20px", color: "white", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Registered Constituency</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                <MapPin size={18} color="var(--primary)" />
                {activeProfile.constituency}, {activeProfile.state}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontFamily: "monospace" }}>
              {activeProfile.epic}
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div style={{ background: "var(--surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Polling Date</div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 600 }}>{activeProfile.date}</div>
            </div>
            <div style={{ background: "var(--surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Current Status</div>
              <div style={{ fontSize: "0.9rem" }}>{renderStatus(activeProfile.status)}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "8px" }}>Contesting Parties</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {activeProfile.parties.map(p => (
                <span key={p} style={{ background: "var(--primary)", padding: "4px 10px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--muted-bg)", borderRadius: "12px", padding: "20px", marginBottom: "24px", border: "1px dashed var(--border-strong)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)", fontWeight: 600 }}>
            <AlertCircle size={16} color="var(--primary)" />
            Link Your EPIC
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
            Enter your Voter ID (EPIC) to see your local polling date and candidates. (Try KA01, DL02, MH03)
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="e.g. KA01234567"
              className="civic-input"
              value={epicInput}
              onChange={e => setEpicInput(e.target.value)}
              style={{ flex: 1, fontFamily: "monospace" }}
            />
            <button className="btn-primary" onClick={handleEpicSubmit}>Verify</button>
          </div>
        </div>
      )}

      {/* Lookup Tool */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Search size={14} /> Check Other Location
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <select className="civic-input" value={searchState} onChange={e => setSearchState(e.target.value)}>
            <option value="">Select State...</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Delhi">Delhi</option>
            <option value="Maharashtra">Maharashtra</option>
          </select>
          <input 
            type="text" 
            placeholder="Constituency" 
            className="civic-input"
            value={searchConst}
            onChange={e => setSearchConst(e.target.value)}
          />
          <button className="btn-outline" onClick={handleSearch}>Lookup</button>
        </div>

        {searchResult && (
          <div className="fade-in-up" style={{ padding: "16px", borderRadius: "8px", background: "var(--success-light)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              {searchResult.constituency}, {searchResult.state}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <span>{searchResult.date}</span>
              {renderStatus(searchResult.status)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
