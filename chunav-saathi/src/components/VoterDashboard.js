"use client";

import { useEffect, useState } from "react";
import { EPIC_NUMBER_PATTERN, validateEpicNumber } from "@/lib/validation";
import { ExternalLink, Info, MapPin, Search } from "lucide-react";

export function VoterDashboard() {
  const [epicInput, setEpicInput] = useState("");
      const [states, setStates] = useState([]);
      const [constituencies, setConstituencies] = useState([]);
      const [selectedState, setSelectedState] = useState("");
      const [selectedConstituency, setSelectedConstituency] = useState("");
      const [booths, setBooths] = useState([]);
      const [loadingStates, setLoadingStates] = useState(true);
      const [loadingConstituencies, setLoadingConstituencies] = useState(false);
      const [loadingBooths, setLoadingBooths] = useState(false);
      const [lookupError, setLookupError] = useState("");
      const [lookupAttempted, setLookupAttempted] = useState(false);
      const [epicMessage, setEpicMessage] = useState("");
      const [epicError, setEpicError] = useState("");

      useEffect(() => {
        let active = true;
        fetch("/api/booths?limit=1")
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Location data is unavailable.");
            if (active) setStates(data.states || []);
          })
          .catch(() => {
            if (active) setLookupError("Location data is unavailable right now.");
          })
          .finally(() => {
            if (active) setLoadingStates(false);
          });
        return () => { active = false; };
      }, []);

      useEffect(() => {
        if (!selectedState) return undefined;
        const controller = new AbortController();
        fetch(`/api/booths?state=${encodeURIComponent(selectedState)}&limit=1`, { signal: controller.signal })
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Constituencies are unavailable.");
            setConstituencies(data.constituencies || []);
          })
          .catch((error) => {
            if (error.name !== "AbortError") setLookupError("Constituencies could not be loaded.");
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoadingConstituencies(false);
          });
        return () => controller.abort();
      }, [selectedState]);

      const checkEpicFormat = () => {
        setEpicError("");
        setEpicMessage("");
        if (!validateEpicNumber(epicInput)) {
          setEpicError("Enter 3 letters followed by 7 digits, for example ABC1234567.");
          return;
        }
        setEpicMessage("Format looks valid. This app does not verify individual voter records.");
      };

      const handleLookup = async () => {
        if (!selectedState || !selectedConstituency) return;
        setLoadingBooths(true);
        setLookupAttempted(true);
        setLookupError("");
        try {
          const params = new URLSearchParams({
            state: selectedState,
            constituency: selectedConstituency,
            limit: "100",
          });
          const response = await fetch(`/api/booths?${params}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Booth records could not be loaded.");
          setBooths(data.booths || []);
        } catch (error) {
          setLookupError(error.message || "Booth records could not be loaded.");
          setBooths([]);
        } finally {
          setLoadingBooths(false);
        }
      };

      return (
        <div className="card" style={{ padding: "20px", borderRadius: "8px", minWidth: 0 }}>
          <div style={{ marginBottom: "18px" }}>
            <div className="section-label"><MapPin size={14} /> Booth and roll lookup</div>
          </div>

          <section aria-labelledby="epic-check-title" style={{ marginBottom: "22px" }}>
            <h2 id="epic-check-title" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
              Individual voter search
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
              This project does not search individual voter records. Use the official ECI service.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <input
                type="text"
                aria-label="EPIC number format check"
                placeholder="ABC1234567"
                maxLength={10}
                pattern={EPIC_NUMBER_PATTERN.source}
                value={epicInput}
                onChange={(event) => {
                  setEpicInput(event.target.value.toUpperCase());
                  setEpicError("");
                  setEpicMessage("");
                }}
                className="civic-input"
                style={{ flex: "1 1 190px", fontFamily: "monospace" }}
              />
              <button type="button" className="btn-outline" onClick={checkEpicFormat}>Check format</button>
              <a
                className="btn-primary"
                href="https://electoralsearch.eci.gov.in/"
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                Official ECI search <ExternalLink size={14} />
              </a>
            </div>
            {epicError && <p role="alert" style={{ marginTop: "8px", color: "var(--danger, #b91c1c)", fontSize: "14px" }}>{epicError}</p>}
            {epicMessage && <p role="status" style={{ marginTop: "8px", color: "var(--text-secondary)", fontSize: "14px" }}>{epicMessage}</p>}
          </section>

          <section aria-labelledby="booth-lookup-title" style={{ borderTop: "1px solid var(--border)", paddingTop: "18px" }}>
            <h2 id="booth-lookup-title" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>
              Polling booths in available records
            </h2>
            <div className="home-booth-filters">
              <select
                className="civic-input"
                aria-label="Select state"
                value={selectedState}
                disabled={loadingStates || states.length === 0}
                onChange={(event) => {
                  setSelectedState(event.target.value);
                  setSelectedConstituency("");
                  setConstituencies([]);
                  setBooths([]);
                  setLookupAttempted(false);
                  setLookupError("");
                  setLoadingConstituencies(Boolean(event.target.value));
                }}
              >
                <option value="">{loadingStates ? "Loading states..." : "Select state"}</option>
                {states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
              <select
                className="civic-input"
                aria-label="Select constituency"
                value={selectedConstituency}
                disabled={!selectedState || loadingConstituencies || constituencies.length === 0}
                onChange={(event) => {
                  setSelectedConstituency(event.target.value);
                  setBooths([]);
                  setLookupAttempted(false);
                }}
              >
                <option value="">
                  {loadingConstituencies ? "Loading constituencies..." : "Select constituency"}
                </option>
                {constituencies.map((constituency) => <option key={constituency} value={constituency}>{constituency}</option>)}
              </select>
              <button
                type="button"
                className="btn-primary"
                disabled={!selectedState || !selectedConstituency || loadingBooths}
                onClick={handleLookup}
              >
                <Search size={14} /> {loadingBooths ? "Searching..." : "Find booths"}
              </button>
            </div>

            {lookupError && <p role="alert" style={{ marginTop: "10px", color: "var(--danger, #b91c1c)", fontSize: "14px" }}>{lookupError}</p>}
            {!lookupError && !loadingStates && !states.length && (
              <p style={{ marginTop: "10px", color: "var(--text-secondary)", fontSize: "14px" }}>No booth location data is available yet.</p>
            )}
            {lookupAttempted && !loadingBooths && !booths.length && !lookupError && (
              <p style={{ marginTop: "10px", color: "var(--text-secondary)", fontSize: "14px" }}>No booth records were found for this selection.</p>
            )}
            {booths.length > 0 && (
              <div className="home-booth-results" aria-live="polite">
                {booths.map((booth) => (
                  <article key={booth._id || booth.boothId} className="home-booth-result">
                    <h3>{booth.name || `Polling part ${booth.boothNumber ?? "not available"}`}</h3>
                    <p>{booth.address || "Address not available"}</p>
                    <p>
                      Part {booth.boothNumber ?? "not available"}
                      {booth.isAccessible == null ? " · Accessibility not available" : ` · Accessible: ${booth.isAccessible ? "Yes" : "No"}`}
                      {booth.pollingDate ? ` · Polling date: ${new Date(booth.pollingDate).toLocaleDateString()}` : " · Polling date not available"}
                    </p>
                  </article>
                ))}
              </div>
            )}
            <p className="home-data-note"><Info size={14} /> Results reflect only records currently available in this project database.</p>
          </section>
        </div>
      );
}
