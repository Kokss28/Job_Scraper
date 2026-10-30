"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Database,
  Download,
  FileSpreadsheet,
  MapPin,
  Sparkles,
  ExternalLink,
  Briefcase,
  Layers,
  Activity,
  Cloud,
  Check,
  Copy,
  Clock,
  Compass
} from "lucide-react";

export default function ScraperStudioPage() {
  const [sources, setSources] = useState<string[]>(["LinkedIn", "Naukri", "Indeed"]);
  const [freshness, setFreshness] = useState<number | string>(24);
  const [location, setLocation] = useState<string>("India");
  const [keywords, setKeywords] = useState<string>("Python developer");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [resultStats, setResultStats] = useState<{ newJobs: number; totalJobs: number; extractedJobs?: number } | null>(null);
  const [bySourceStats, setBySourceStats] = useState<Record<string, number> | null>(null);
  const [sampleJobs, setSampleJobs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"table" | "terminal" | "telemetry">("table");
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab === "terminal" && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  const toggleSource = (src: string) => {
    setSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  };

  const locationPresets = ["All India", "Coimbatore", "Bengaluru", "Chennai", "Hyderabad", "Pune", "Remote"];
  const keywordPresets = ["Python developer", "Data Analyst", "Data Engineer", "AI / ML Engineer", "Full Stack Developer"];

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    navigator.clipboard.writeText(logs.join("\n"));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleTriggerScrape = async () => {
    if (sources.length === 0) {
      alert("Please select at least one target portal.");
      return;
    }
    setStatus("running");
    setStatusMessage("Executing crawler pipeline with real-time stream ingestion...");
    setLogs([
      "Initializing Live Ingestion Engine...",
      "Targeting portals: " + sources.join(", "),
      `Search query: "${keywords}" in "${location}" (past ${freshness}h)`,
      "Full-page fetching enabled (deep description & educational tables)...",
      "Connecting to live job feeds..."
    ]);
    setActiveTab("terminal");
    setResultStats(null);
    setBySourceStats(null);

    try {
      const res = await fetch("/api/scraper/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources,
          freshness: Number(freshness) || 24,
          keywords,
          location,
          enableDetails: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      if (!res.body) {
        throw new Error("No live stream available from server.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split("\n");
          let eventType = "message";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6);
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (eventType === "log" && data.text) {
              setLogs((prev) => [...prev, data.text]);
            } else if (eventType === "done") {
              if (data.success) {
                setStatus("success");
                const extractedCount = data.result?.extracted_jobs ?? data.result?.new_jobs ?? 0;
                const newCount = data.result?.new_jobs ?? 0;
                const total = data.result?.total_jobs ?? 0;
                setResultStats({ newJobs: newCount, totalJobs: total, extractedJobs: extractedCount });
                if (data.result?.by_source) {
                  setBySourceStats(data.result.by_source);
                }
                if (data.result?.sample_jobs) {
                  setSampleJobs(data.result.sample_jobs);
                }

                if (extractedCount === 0) {
                  setStatusMessage(
                    `No jobs matching "${keywords}" found in "${location}" within ${freshness}h. (0 verified listings returned). Try expanding the freshness window (e.g. 72h or 7d) or keywords.`
                  );
                } else {
                  setStatusMessage(
                    `Harvest complete! Processed ${extractedCount} verified jobs matching "${location}" across ${sources.join(", ")} (${newCount} new to catalog). Supabase synced.`
                  );
                  setActiveTab("table");
                }
              } else {
                setStatus("error");
                setStatusMessage(data.error || "Scraper process encountered an issue.");
              }
            }
          } catch (e) {
            console.error("Failed to parse stream event:", e);
          }
        }
      }
    } catch (err: any) {
      setStatus("error");
      setStatusMessage(err?.message || "Failed to connect to scraper pipeline.");
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Global Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <Activity className="w-3.5 h-3.5" />
            Live Ingestion Operations
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Live Scraper &amp; Ingestion Studio
          </h1>
          <p className="text-slate-600 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed font-medium">
            Harvest real-time postings across LinkedIn, Naukri, and Indeed. Automatically parses complete job descriptions, experience bounds, and exact degree requirements directly into SQLite and Supabase Cloud.
          </p>
        </div>

        {/* Top Badges & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-xs text-xs text-slate-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Cloud: Active</span>
          </div>

          <a
            href="/api/scraper/export?batch=latest"
            download="extracted_jobs.csv"
            data-testid="top-download-csv-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all shrink-0"
            title="Download last extracted batch as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Download Last Batch
          </a>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Clean Ingestion Dispatcher (5 Cols / ~42%)   */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-5 md:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Configure Ingestion Run
            </h2>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Full Details Enabled
            </span>
          </div>

          {/* Target Portals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Target Portals
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSources(["LinkedIn", "Naukri", "Indeed"])}
                  className={`px-2.5 py-1 rounded-lg transition-all font-bold border ${
                    sources.length === 3
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  All 3
                </button>
                <button
                  type="button"
                  onClick={() => setSources(["Naukri"])}
                  className={`px-2.5 py-1 rounded-lg transition-all font-bold border ${
                    sources.length === 1 && sources.includes("Naukri")
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  Naukri Only
                </button>
                <button
                  type="button"
                  onClick={() => setSources(["LinkedIn"])}
                  className={`px-2.5 py-1 rounded-lg transition-all font-bold border ${
                    sources.length === 1 && sources.includes("LinkedIn")
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  LinkedIn Only
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["LinkedIn", "Naukri", "Indeed"].map((src) => {
                const active = sources.includes(src);
                return (
                  <button
                    key={src}
                    type="button"
                    data-testid={`scraper-src-${src.toLowerCase()}`}
                    onClick={() => toggleSource(src)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" : "bg-slate-400"}`} />
                    {src}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Keywords */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Search Keywords
            </label>
            <input
              type="text"
              data-testid="scrape-keywords-input"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 font-semibold"
              placeholder="e.g. Python developer, data analyst"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Suggestions:</span>
              {keywordPresets.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setKeywords(kw)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                    keywords === kw
                      ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900 font-medium"
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Target Location Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Target Search Location
              </label>
              <span className="text-slate-500 text-[10px] font-medium">
                Active: <span className="text-slate-900 font-bold">{location || "India"}</span>
              </span>
            </div>
            <input
              type="text"
              data-testid="scrape-location-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 font-semibold"
              placeholder="e.g. India, Bengaluru, Pune, Hyderabad"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Cities:</span>
              {locationPresets.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc === "All India" ? "India" : loc)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                    (loc === "All India" && (location === "India" || !location)) || location === loc
                      ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900 font-medium"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Search Time Range (in Hours) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Posting Time Window
              </label>
              <span className="text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200">
                Past {freshness || 0} Hour{Number(freshness) === 1 ? "" : "s"}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                data-testid="freshness-hours-input"
                value={freshness || ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                  setFreshness(e.target.value === "" ? "" : Math.max(1, val));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                placeholder="Hours (e.g. 24, 72)"
              />
              <div className="absolute right-4 top-2.5 text-xs text-slate-500 pointer-events-none font-bold">
                Hours
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Presets:</span>
              {[
                { label: "24h (1 Day)", val: 24 },
                { label: "72h (3 Days)", val: 72 },
                { label: "7d (1 Week)", val: 168 },
                { label: "4h", val: 4 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setFreshness(p.val)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                    Number(freshness) === p.val
                      ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900 font-medium"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
              Target postings published within the last <span className="text-slate-900 font-bold">{freshness}h</span> (e.g. 24 for 1 day, 72 for 3 days).
            </p>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleTriggerScrape}
            data-testid="dispatch-scrape-btn"
            disabled={status === "running"}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-xs md:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              status === "running"
                ? "bg-slate-400 cursor-not-allowed opacity-80"
                : "bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-600/25"
            }`}
          >
            {status === "running" ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Extracting Live Data &amp; Degrees...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Dispatch Scraper Run
              </>
            )}
          </button>

          {/* Status notification */}
          {status !== "idle" && (
            <div
              data-testid="scrape-status-banner"
              className={`p-3.5 rounded-xl text-xs flex flex-col gap-2 border shadow-xs ${
                status === "running"
                  ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                  : status === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-rose-50 text-rose-900 border-rose-200"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {status === "running" && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />}
                  {status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {status === "error" && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                  <span className="font-bold text-[11px] leading-tight">{statusMessage}</span>
                </div>

                {status === "success" && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/scraper/export?batch=latest&sources=${sources.join(",")}&freshness=${freshness}`}
                      download="latest_extracted_jobs.csv"
                      data-testid="banner-download-csv-btn"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-sm transition-all"
                    >
                      <Download className="w-3 h-3" />
                      Download Batch CSV
                    </a>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all"
                    >
                      Explore
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Live Operations & Monitoring Deck (7 Cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* Pipeline Stepper Bar */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              Automated Pipeline Stages
            </span>

            <div className="flex items-center gap-1.5 text-[10px]">
              <span className={`px-2.5 py-1 rounded-md font-bold border flex items-center gap-1 ${
                status === "running"
                  ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                  : status === "success"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-white text-slate-600 border-slate-200 shadow-xs"
              }`}>
                1. Web Crawl
              </span>
              <span className="text-slate-400 font-bold">➔</span>
              <span className={`px-2.5 py-1 rounded-md font-bold border flex items-center gap-1 ${
                status === "running"
                  ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                  : status === "success"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-white text-slate-600 border-slate-200 shadow-xs"
              }`}>
                2. Degree &amp; Exp Parsing
              </span>
              <span className="text-slate-400 font-bold">➔</span>
              <span className={`px-2.5 py-1 rounded-md font-bold border flex items-center gap-1 ${
                status === "success"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-white text-slate-600 border-slate-200 shadow-xs"
              }`}>
                3. Supabase Cloud Sync
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200 bg-slate-50/50">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "table"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Fresh Batch Table
                {sampleJobs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    {sampleJobs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("terminal")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "terminal"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Live Console Output
                {logs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                    {logs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("telemetry")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "telemetry"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Sync Telemetry
              </button>
            </div>

            {/* Quick Copy Logs button if on terminal */}
            {activeTab === "terminal" && logs.length > 0 && (
              <button
                type="button"
                onClick={handleCopyLogs}
                className="text-[10px] pb-2 text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 transition-colors"
              >
                {copiedLogs ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedLogs ? "Copied!" : "Copy Stream"}
              </button>
            )}
          </div>

          {/* TAB CONTENT CONTAINER */}
          <div className="p-5 flex-1 min-h-[380px] flex flex-col justify-between">
            {/* TAB 1: Fresh Batch Table */}
            {activeTab === "table" && (
              <div className="space-y-4">
                {sampleJobs.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                    <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
                      {sampleJobs.map((job, idx) => (
                        <div key={idx} className="p-3 hover:bg-indigo-50/50 transition-colors flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 truncate">{job.title}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                job.source === "LinkedIn" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                job.source === "Naukri" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}>
                                {job.source}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-2 flex-wrap font-medium">
                              <span className="font-semibold text-slate-800">{job.company}</span>
                              <span className="text-slate-400">•</span>
                              <span>{job.city || "India"}</span>
                              {job.degree_required && job.degree_required !== "Not Specified" && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                    🎓 {job.degree_required}
                                  </span>
                                </>
                              )}
                              {(job.min_experience_years || job.max_experience_years) && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    💼 {job.min_experience_years || 0} - {job.max_experience_years || "N/A"} yrs
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {job.link && (
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                              title="Open original job posting"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                    <Briefcase className="w-10 h-10 text-slate-400 mb-3" />
                    <h4 className="text-sm font-bold text-slate-800">No Fresh Batch Scraped in Current Session</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 font-medium">
                      Configure your portals, keywords, and time window on the left, then click <strong>"Dispatch Scraper Run"</strong> to see live records stream in.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Live Console Terminal */}
            {activeTab === "terminal" && (
              <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 font-mono text-[11px] text-slate-200 space-y-1 max-h-[340px] overflow-y-auto shadow-inner">
                {logs.length > 0 ? (
                  logs.map((logLine, idx) => (
                    <div key={idx} className="leading-relaxed font-mono">
                      {logLine.startsWith("[WARN]") ? (
                        <span className="text-amber-400">{logLine}</span>
                      ) : logLine.includes("Error") || logLine.startsWith("[ERROR]") ? (
                        <span className="text-rose-400">{logLine}</span>
                      ) : logLine.includes("successfully") || logLine.includes("Harvest complete") || logLine.includes("synced") ? (
                        <span className="text-emerald-400">{logLine}</span>
                      ) : (
                        <span className="text-slate-200">{logLine}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic py-8 text-center font-medium">
                    Awaiting scraper dispatch... Console logs will stream here in real time.
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            )}

            {/* TAB 3: Telemetry & Platform Breakdown */}
            {activeTab === "telemetry" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-xs">
                    <span className="text-[11px] text-slate-600 uppercase font-bold block mb-1">LinkedIn</span>
                    <span className="text-2xl font-black text-blue-600">
                      {bySourceStats ? (bySourceStats["LinkedIn"] ?? bySourceStats["linkedin"] ?? 0) : "-"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">Guest + API</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-xs">
                    <span className="text-[11px] text-slate-600 uppercase font-bold block mb-1">Naukri</span>
                    <span className="text-2xl font-black text-emerald-600">
                      {bySourceStats ? (bySourceStats["Naukri"] ?? bySourceStats["naukri"] ?? 0) : "-"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">Deep Page Scraped</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-xs">
                    <span className="text-[11px] text-slate-600 uppercase font-bold block mb-1">Indeed</span>
                    <span className="text-2xl font-black text-indigo-600">
                      {bySourceStats ? (bySourceStats["Indeed"] ?? bySourceStats["indeed"] ?? 0) : "-"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block mt-1">JobSpy Backend</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                    Supabase Cloud Sync Verification
                  </span>
                  <p className="text-slate-700 text-[11px] leading-relaxed font-medium">
                    All harvested jobs are verified with unique <code className="text-indigo-800 font-mono font-bold">job_id</code> hashing, cleaned via regular expressions and NLP enrichment, and automatically synchronized into your live cloud table <code className="text-indigo-800 font-mono font-bold">public.jobs</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar on Right Deck */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Download options:</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/scraper/export?batch=latest&sources=${sources.join(",")}&freshness=${freshness}`}
                  download="latest_extracted_jobs.csv"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 transition-all flex items-center gap-1.5 text-xs shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  Recent Batch CSV
                </a>
                <a
                  href="/api/scraper/export?batch=history"
                  download="extraction_history.csv"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 transition-all flex items-center gap-1.5 text-xs shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  Extraction Log CSV
                </a>
                <a
                  href="/api/scraper/export?batch=all"
                  download="master_all_jobs.csv"
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-300 transition-all text-xs shadow-xs"
                >
                  Full Catalog
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
