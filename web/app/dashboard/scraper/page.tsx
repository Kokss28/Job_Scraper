"use client";

import { useState } from "react";
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
  const [freshness, setFreshness] = useState<number | string>(4);
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

  const toggleSource = (src: string) => {
    setSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  };

  const locationPresets = ["All India", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Remote"];
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
    setStatusMessage("Executing crawler pipeline with full page extraction...");
    setLogs([
      "Initializing Live Ingestion Engine...",
      "Targeting portals: " + sources.join(", "),
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
          freshness: Number(freshness) || 4,
          keywords,
          location,
          enableDetails: true, // Always extracts complete descriptions and degrees
        }),
      });

      const data = await res.json();

      if (data.logs && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }

      if (res.ok && data.success) {
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
        setStatusMessage(
          `Harvest complete! Processed ${extractedCount} verified jobs with rich details (${newCount} new to catalog). Supabase synced.`
        );
        setActiveTab("table");
      } else {
        setStatus("error");
        setStatusMessage(data.error || "Scraper process encountered an error.");
      }
    } catch (err: any) {
      setStatus("error");
      setStatusMessage(err?.message || "Failed to connect to scraper pipeline.");
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Global Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-2">
            <Activity className="w-3.5 h-3.5" />
            Live Ingestion Operations
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Live Scraper &amp; Ingestion Studio
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
            Harvest real-time postings across LinkedIn, Naukri, and Indeed. Automatically parses complete job descriptions, experience bounds, and exact degree requirements directly into SQLite and Supabase Cloud.
          </p>
        </div>

        {/* Top Badges & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">Supabase Cloud: Active</span>
          </div>

          <a
            href="/api/scraper/export?batch=latest"
            download="extracted_jobs.csv"
            data-testid="top-download-csv-btn"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all shrink-0"
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
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 p-5 md:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Configure Ingestion Run
            </h2>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Full Details Enabled
            </span>
          </div>

          {/* Target Portals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Target Portals
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSources(["LinkedIn", "Naukri", "Indeed"])}
                  className={`px-2 py-0.5 rounded transition-all font-medium border ${
                    sources.length === 3
                      ? "bg-slate-700 text-white border-slate-600 font-bold"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  All 3
                </button>
                <button
                  type="button"
                  onClick={() => setSources(["Naukri"])}
                  className={`px-2 py-0.5 rounded transition-all font-medium border ${
                    sources.length === 1 && sources.includes("Naukri")
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                  }`}
                >
                  Naukri Only
                </button>
                <button
                  type="button"
                  onClick={() => setSources(["LinkedIn"])}
                  className={`px-2 py-0.5 rounded transition-all font-medium border ${
                    sources.length === 1 && sources.includes("LinkedIn")
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
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
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-slate-600"}`} />
                    {src}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Keywords */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Search Keywords
            </label>
            <input
              type="text"
              data-testid="scrape-keywords-input"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
              placeholder="e.g. Python developer, data analyst"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Suggestions:</span>
              {keywordPresets.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setKeywords(kw)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                    keywords === kw
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
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
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                Target Search Location
              </label>
              <span className="text-slate-400 text-[10px]">
                Active: <span className="text-white font-medium">{location || "India"}</span>
              </span>
            </div>
            <input
              type="text"
              data-testid="scrape-location-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
              placeholder="e.g. India, Bengaluru, Pune, Hyderabad"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Cities:</span>
              {locationPresets.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc === "All India" ? "India" : loc)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                    (loc === "All India" && (location === "India" || !location)) || location === loc
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
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
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Posting Time Window
              </label>
              <span className="text-indigo-400 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30">
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
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                placeholder="Hours (e.g. 4, 8, 24)"
              />
              <div className="absolute right-4 top-2 text-xs text-slate-500 pointer-events-none font-medium">
                Hours
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Target postings published within the last <span className="text-slate-200 font-semibold">{freshness}h</span> (e.g. 4 for 4h, 8 for 8h, 24 for 24h).
            </p>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleTriggerScrape}
            data-testid="dispatch-scrape-btn"
            disabled={status === "running"}
            className={`w-full py-3 rounded-xl text-white font-bold text-xs md:text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
              status === "running"
                ? "bg-slate-800 cursor-not-allowed opacity-80"
                : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/30"
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
              className={`p-3.5 rounded-xl text-xs flex flex-col gap-2 border ${
                status === "running"
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                  : status === "success"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {status === "running" && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />}
                  {status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {status === "error" && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <span className="font-semibold text-[11px] leading-tight">{statusMessage}</span>
                </div>

                {status === "success" && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/scraper/export?batch=latest&sources=${sources.join(",")}&freshness=${freshness}`}
                      download="latest_extracted_jobs.csv"
                      data-testid="banner-download-csv-btn"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-sm transition-all"
                    >
                      <Download className="w-3 h-3" />
                      Download Batch CSV
                    </a>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all"
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
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl overflow-hidden flex flex-col">
          {/* Pipeline Stepper Bar */}
          <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              Automated Pipeline Stages
            </span>

            <div className="flex items-center gap-1.5 text-[10px]">
              <span className={`px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                status === "running"
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                  : status === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}>
                1. Web Crawl
              </span>
              <span className="text-slate-600">➔</span>
              <span className={`px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                status === "running"
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                  : status === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}>
                2. Degree &amp; Exp Parsing
              </span>
              <span className="text-slate-600">➔</span>
              <span className={`px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                status === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}>
                3. Supabase Cloud Sync
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-800/80 bg-slate-950/40">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "table"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Fresh Batch Table
                {sampleJobs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px]">
                    {sampleJobs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("terminal")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "terminal"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Live Console Output
                {logs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                    {logs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("telemetry")}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === "telemetry"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
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
                className="text-[10px] pb-2 text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
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
                  <div className="rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950/60">
                    <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-800/60">
                      {sampleJobs.map((job, idx) => (
                        <div key={idx} className="p-3 hover:bg-slate-900/50 transition-colors flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 truncate">{job.title}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                job.source === "LinkedIn" ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" :
                                job.source === "Naukri" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                                "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                              }`}>
                                {job.source}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{job.company}</span>
                              <span>•</span>
                              <span>{job.city || "India"}</span>
                              {job.degree_required && job.degree_required !== "Not Specified" && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-300 font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                    🎓 {job.degree_required}
                                  </span>
                                </>
                              )}
                              {(job.min_experience_years || job.max_experience_years) && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-300 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
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
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
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
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
                    <Briefcase className="w-10 h-10 text-slate-600 mb-3" />
                    <h4 className="text-sm font-bold text-slate-300">No Fresh Batch Scraped in Current Session</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Configure your portals, keywords, and time window on the left, then click <strong>"Dispatch Scraper Run"</strong> to see live records stream in.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Live Console Terminal */}
            {activeTab === "terminal" && (
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-300 space-y-1 max-h-[340px] overflow-y-auto">
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
                        <span className="text-slate-300">{logLine}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic py-8 text-center">
                    Awaiting scraper dispatch... Console logs will stream here in real time.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Telemetry & Platform Breakdown */}
            {activeTab === "telemetry" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">LinkedIn</span>
                    <span className="text-xl font-extrabold text-blue-400">
                      {bySourceStats ? (bySourceStats["LinkedIn"] ?? bySourceStats["linkedin"] ?? 0) : "-"}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">Guest + API</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Naukri</span>
                    <span className="text-xl font-extrabold text-emerald-400">
                      {bySourceStats ? (bySourceStats["Naukri"] ?? bySourceStats["naukri"] ?? 0) : "-"}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">Deep Page Scraped</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Indeed</span>
                    <span className="text-xl font-extrabold text-indigo-400">
                      {bySourceStats ? (bySourceStats["Indeed"] ?? bySourceStats["indeed"] ?? 0) : "-"}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">JobSpy Backend</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    Supabase Cloud Sync Verification
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    All harvested jobs are verified with unique <code className="text-indigo-300 font-mono">job_id</code> hashing, cleaned via regular expressions and NLP enrichment, and automatically synchronized into your live cloud table <code className="text-indigo-300 font-mono">public.jobs</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar on Right Deck */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Download options:</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/scraper/export?batch=latest&sources=${sources.join(",")}&freshness=${freshness}`}
                  download="latest_extracted_jobs.csv"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 transition-all flex items-center gap-1.5 text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Recent Batch CSV
                </a>
                <a
                  href="/api/scraper/export?batch=all"
                  download="master_all_jobs.csv"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition-all text-xs"
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
