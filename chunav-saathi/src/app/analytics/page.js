"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Filter,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

const DEFAULT_FILTERS = {
  state: "all",
  category: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

const STATUS_COLORS = {
  Resolved: "#19a775",
  Pending: "#f3a33b",
  "In Progress": "#3975e8",
  Rejected: "#e56b8a",
};

const CATEGORY_COLORS = ["#3975e8", "#19a775", "#e88754", "#9a7be7", "#e56b8a"];

function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function PanelTitle({ eyebrow, title, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note, color }) {
  return (
    <Panel className="min-w-0 p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon size={17} strokeWidth={1.8} />
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="text-3xl font-semibold leading-none tracking-[-0.055em] text-[var(--text-primary)]">
          {value}
        </span>
        <span className="inline-flex items-center rounded-full bg-[var(--muted-bg)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
          {note}
        </span>
      </div>
    </Panel>
  );
}

function TrendChart({ data }) {
  const points = data.map((item, index) => ({
    x: data.length === 1 ? 360 : 38 + (index * 684) / (data.length - 1),
    y: 202 - (item.value / Math.max(...data.map((point) => point.value), 1)) * 160,
    ...item,
  }));

  if (!points.length) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-[var(--text-muted)]">
        No trend data for this selection.
      </div>
    );
  }

  const line = points.map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");
  const area = `${line} L ${points.at(-1).x} 220 L ${points[0].x} 220 Z`;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-4xl font-semibold leading-none tracking-[-0.06em] text-[var(--text-primary)]">
            {data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">complaints in the selected period</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--muted-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <Activity size={13} className="text-[#3975e8]" />
          Monthly overview
        </span>
      </div>
      <svg
        className="mt-5 h-auto w-full overflow-visible"
        viewBox="0 0 760 250"
        role="img"
        aria-label="Monthly complaint trend chart"
      >
        <defs>
          <linearGradient id="analytics-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3975e8" stopOpacity=".22" />
            <stop offset="100%" stopColor="#3975e8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[42, 86, 130, 174, 220].map((y) => (
          <line
            key={y}
            x1="38"
            x2="722"
            y1={y}
            y2={y}
            stroke="var(--border)"
            strokeDasharray="4 6"
            strokeWidth="1"
          />
        ))}
        {data.length > 1 && <path d={area} fill="url(#analytics-area)" />}
        {data.length > 1 && (
          <path d={line} fill="none" stroke="#3975e8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        )}
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" fill="#3975e8" stroke="var(--surface)" strokeWidth="3" />
            <text
              x={point.x}
              y="243"
              fill="var(--text-muted)"
              fontSize="10"
              textAnchor="middle"
            >
              {point.label}
            </text>
            <title>{`${point.label}: ${point.value} complaints`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatusBreakdown({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = data.reduce((result, item) => {
    const length = total ? (item.value / total) * circumference : 0;
    const previous = result[result.length - 1];
    result.push({ ...item, length, offset: previous ? previous.offset + previous.length : 0 });
    return result;
  }, []);

  return (
    <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 108 108" className="size-full -rotate-90" role="img" aria-label="Complaints by status">
          <circle cx="54" cy="54" r={radius} fill="none" stroke="var(--muted-bg)" strokeWidth="12" />
          {segments.map((segment) => (
              <circle
                key={segment.label}
                cx="54"
                cy="54"
                r={radius}
                fill="none"
                stroke={STATUS_COLORS[segment.label] || "#94a3b8"}
                strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                strokeDashoffset={-segment.offset}
                strokeWidth="12"
              />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{total}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">total</span>
        </div>
      </div>
      <div className="grid w-full gap-3">
        {data.length ? data.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.label] || "#94a3b8" }} />
              {item.label}
            </span>
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">{item.value.toLocaleString()}</span>
          </div>
        )) : <p className="text-sm text-[var(--text-muted)]">No status data yet.</p>}
      </div>
    </div>
  );
}

function BreakdownBars({ data }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  if (!data.length) return <p className="mt-6 text-sm text-[var(--text-muted)]">No category data yet.</p>;

  return (
    <div className="mt-6 space-y-5">
      {data.slice(0, 5).map((item, index) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-[var(--text-secondary)]">{item.label || "Uncategorized"}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[var(--text-primary)]">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--muted-bg)]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max((item.value / maxValue) * 100, 2)}%`,
                backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
      {label}
      <select
        className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[#3975e8]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const fetchAnalytics = useCallback(async (selectedFilters) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(selectedFilters).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value);
      });
      const response = await fetch(`/api/analytics?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load analytics.");
      setAnalytics(data);
    } catch (fetchError) {
      setError(fetchError.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchAnalytics(DEFAULT_FILTERS), 0);
    return () => window.clearTimeout(timer);
  }, [fetchAnalytics]);

  const exportCsv = () => {
    const complaints = analytics?.recentComplaints || [];
    const headers = ["ID", "Subject", "Category", "Status", "Priority", "State", "District", "Date"];
    const rows = complaints.map((item) => [
      item.complaintId,
      item.subject,
      item.category,
      item.status,
      item.priority,
      item.state,
      item.district,
      item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "chunav-saathi-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = () => fetchAnalytics(filters);
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    fetchAnalytics(DEFAULT_FILTERS);
  };
  const kpis = analytics?.kpis || {};
  const statuses = analytics?.charts?.statusBreakdown || [];
  const regions = analytics?.charts?.stateBreakdown || [];
  const categories = analytics?.charts?.categoryBreakdown || [];
  const trend = (analytics?.charts?.monthlyTrend || []).map((item) => ({
    ...item,
    label: new Date(`${item.label}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" }),
  }));

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-16 pt-[112px] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1380px]">
        <header className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
              <span className="size-2 rounded-full bg-[#19a775]" />
              Election operations · Live overview
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
              Analytics overview
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              A clear view of voter support, complaint resolution, and activity across regions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((visible) => !visible)}
              aria-expanded={showFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[#3975e8] hover:text-[#3975e8]"
            >
              <Filter size={15} />
              Filters
              {showFilters ? <X size={14} /> : null}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!analytics}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[#3975e8] hover:text-[#3975e8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={15} />
              Export
            </button>
            <button
              type="button"
              onClick={() => fetchAnalytics(filters)}
              disabled={loading}
              aria-label="Refresh analytics"
              className="inline-flex size-10 items-center justify-center rounded-xl bg-[#3975e8] text-white transition hover:bg-[#285fc7] disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {showFilters && (
          <Panel className="mb-5 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[var(--text-primary)]">Refine the overview</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Choose a region, category, status, or date range.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
                className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--muted-bg)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <FilterSelect
                label="State / UT"
                value={filters.state}
                onChange={(value) => updateFilter("state", value)}
                options={[
                  { value: "all", label: "All regions" },
                  ...(analytics?.filters?.states || []).map((value) => ({ value, label: value })),
                ]}
              />
              <FilterSelect
                label="Category"
                value={filters.category}
                onChange={(value) => updateFilter("category", value)}
                options={[
                  { value: "all", label: "All categories" },
                  ...(analytics?.filters?.categories || []).map((value) => ({ value, label: value })),
                ]}
              />
              <FilterSelect
                label="Status"
                value={filters.status}
                onChange={(value) => updateFilter("status", value)}
                options={[
                  { value: "all", label: "All statuses" },
                  ...(analytics?.filters?.statuses || []).map((value) => ({ value, label: value })),
                ]}
              />
              <label className="grid gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                From
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter("dateFrom", event.target.value)}
                  className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#3975e8]"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                To
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter("dateTo", event.target.value)}
                  className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#3975e8]"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={applyFilters} className="rounded-xl bg-[#3975e8] px-4 py-2 text-sm font-medium text-white hover:bg-[#285fc7]">
                Apply filters
              </button>
              <button type="button" onClick={resetFilters} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--muted-bg)]">
                Reset
              </button>
            </div>
          </Panel>
        )}

        {error ? (
          <Panel className="flex flex-col items-center px-6 py-14 text-center">
            <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-[#e56b8a]/10 text-[#e56b8a]">
              <Activity size={20} />
            </span>
            <h2 className="font-semibold text-[var(--text-primary)]">Analytics are unavailable</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{error}</p>
            <button type="button" onClick={() => fetchAnalytics(filters)} className="mt-5 rounded-xl bg-[#3975e8] px-4 py-2 text-sm font-medium text-white">
              Try again
            </button>
          </Panel>
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={FileText} label="Total complaints" value={loading && !analytics ? "—" : (kpis.totalComplaints ?? 0).toLocaleString()} note="All received" color="#3975e8" />
              <MetricCard icon={CheckCircle2} label="Resolved" value={loading && !analytics ? "—" : (kpis.resolvedCount ?? 0).toLocaleString()} note={`${kpis.resolutionRate ?? 0}% of total`} color="#19a775" />
              <MetricCard icon={Clock3} label="Awaiting action" value={loading && !analytics ? "—" : (kpis.pendingCount ?? 0).toLocaleString()} note={`${kpis.inProgressCount ?? 0} in progress`} color="#e88754" />
              <MetricCard icon={MapPin} label="Polling booths" value={loading && !analytics ? "—" : (kpis.totalBooths ?? 0).toLocaleString()} note={`${(kpis.accessibleBooths ?? 0).toLocaleString()} accessible`} color="#9a7be7" />
            </div>

            <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
              <Panel className="p-5 sm:p-6">
                <PanelTitle
                  eyebrow="Activity"
                  title="Complaint volume"
                  action={
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#3975e8]/10 px-3 py-1.5 text-xs font-medium text-[#3975e8]">
                      <span className="size-1.5 rounded-full bg-[#3975e8]" />
                      By month
                    </span>
                  }
                />
                {loading && !analytics ? (
                  <div className="mt-8 h-56 animate-pulse rounded-xl bg-[var(--muted-bg)]" />
                ) : <TrendChart data={trend} />}
              </Panel>

              <Panel className="p-5 sm:p-6">
                <PanelTitle eyebrow="Resolution" title="Status breakdown" />
                {loading && !analytics ? (
                  <div className="mt-8 flex justify-center"><div className="size-36 animate-pulse rounded-full bg-[var(--muted-bg)]" /></div>
                ) : <StatusBreakdown data={statuses} />}
                <div className="mt-5 flex items-start gap-2 rounded-xl bg-[var(--muted-bg)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#19a775]" />
                  Resolution rate is calculated from complaints marked resolved.
                </div>
              </Panel>
            </div>

            <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(260px,0.85fr)]">
              <Panel className="p-5 sm:p-6">
                <PanelTitle eyebrow="What people need" title="Top categories" />
                {loading && !analytics ? (
                  <div className="mt-6 h-40 animate-pulse rounded-xl bg-[var(--muted-bg)]" />
                ) : <BreakdownBars data={categories} />}
              </Panel>

              <Panel className="p-5 sm:p-6">
                <PanelTitle eyebrow="Across India" title="Activity by region" />
                {loading && !analytics ? (
                  <div className="mt-6 h-40 animate-pulse rounded-xl bg-[var(--muted-bg)]" />
                ) : (
                  <div className="mt-4 divide-y divide-[var(--border)]">
                    {regions.slice(0, 5).map((region, index) => (
                      <div key={region.label} className="flex items-center justify-between gap-3 py-3">
                        <span className="flex min-w-0 items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--muted-bg)] text-[11px] font-semibold text-[var(--text-muted)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="truncate">{region.label || "Unspecified"}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">{region.value.toLocaleString()}</span>
                      </div>
                    ))}
                    {!regions.length && <p className="py-6 text-sm text-[var(--text-muted)]">No regional data yet.</p>}
                  </div>
                )}
              </Panel>

              <section className="relative isolate flex min-h-[240px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#315fc7] via-[#347de4] to-[#48a7c5] p-5 text-white shadow-sm sm:p-6">
                <div className="absolute -right-12 -top-12 -z-10 size-48 rounded-full border border-white/15" />
                <div className="absolute -right-2 -top-2 -z-10 size-28 rounded-full border border-white/15" />
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                    <Activity size={12} /> At a glance
                  </span>
                  <p className="mt-7 text-5xl font-semibold tracking-[-0.06em]">{kpis.resolutionRate ?? 0}%</p>
                  <h2 className="mt-2 max-w-[220px] text-sm font-semibold leading-5">of reported complaints have been resolved</h2>
                  <p className="mt-2 max-w-[250px] text-xs leading-5 text-white/75">
                    {kpis.avgResolutionDays === "N/A" || kpis.avgResolutionDays == null
                      ? "Resolution time will appear as cases are completed."
                      : `Average time to resolution: ${kpis.avgResolutionDays} days.`}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-xs text-white/85">
                  <span>Service progress</span>
                  <span className="inline-flex items-center gap-1 font-semibold"><Check size={13} /> Tracked live</span>
                </div>
              </section>
            </div>

            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
                <PanelTitle eyebrow="Latest updates" title="Recent complaints" />
                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Users size={14} /> {analytics?.recentComplaints?.length || 0} records
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-y border-[var(--border)] bg-[var(--muted-bg)]/70 text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                      <th className="px-5 py-3 font-semibold">Complaint</th>
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-5 py-3 font-semibold">Region</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {(analytics?.recentComplaints || []).map((complaint) => (
                      <tr key={complaint.complaintId} className="transition-colors hover:bg-[var(--muted-bg)]/60">
                        <td className="max-w-[300px] px-5 py-3.5">
                          <p className="truncate font-medium text-[var(--text-primary)]">{complaint.subject || "Untitled complaint"}</p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{complaint.complaintId}</p>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--text-secondary)]">{complaint.category || "—"}</td>
                        <td className="px-5 py-3.5 text-[var(--text-secondary)]">{[complaint.district, complaint.state].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                            style={{
                              color: STATUS_COLORS[complaint.status] || "#94a3b8",
                              backgroundColor: `${STATUS_COLORS[complaint.status] || "#94a3b8"}18`,
                            }}
                          >
                            <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[complaint.status] || "#94a3b8" }} />
                            {complaint.status || "Unknown"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[var(--text-muted)]">
                          {complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                    {!analytics?.recentComplaints?.length && (
                      <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">No complaints to display for this selection.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3.5 text-xs text-[var(--text-muted)] sm:px-6">
                <span>Showing the latest {analytics?.recentComplaints?.length || 0} records</span>
                <span className="inline-flex items-center gap-1 font-medium text-[#3975e8]">Updated from live data <ArrowRight size={13} /></span>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
