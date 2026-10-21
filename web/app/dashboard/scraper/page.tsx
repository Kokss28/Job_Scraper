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
  ShieldCheck,
  Database,
  Download,
  FileSpreadsheet,
  MapPin,
  Sparkles,
  ExternalLink,
  Briefcase
} from "lucide-react";

export default function ScraperStudioPage() {
  const [sources, setSources] = useState<string[]>(["LinkedIn", "Naukri", "Indeed"]);
  const [freshness, setFreshness] = useState<number | string>(4);
  const [location, setLocation] = useState<string>("India");
  const [keywords, setKeywords] = useState<string>("Python developer");
  const [enableDetails, setEnableDetails] = useState<boolean>(true);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [resultStats, setResultStats] = useState<{ newJobs: number; totalJobs: number; extractedJobs?: number } | null>(null);
  const [bySourceStats, setBySourceStats] = useState<Record<string, number> | null>(null);
  const [sampleJobs, setSampleJobs] = useState<any[]>([]);

  const toggleSource = (src: string) => {
    setSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  };

  const locationPresets = ["All India", "Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi NCR", "Remote"];
  const keywordPresets = ["Python developer", "Data Analyst", "Data Engineer", "AI / ML Engineer", "Full Stack Developer"];

  const handleTriggerScrape = async () => {
    if (sources.length === 0) {
      alert("Please select at least one platform.");
      return;
    }
    setStatus("running");
    setStatusMessage("Executing live scraping run across selected platforms...");
    setLogs(["Connecting to live scraper engine...", "Dispatching crawler process..."]);
    setResultStats(null);
    setBySourceStats(null);
    setSampleJobs([]);

    try {
      const res = await fetch("/api/scraper/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources,
          freshness: Number(freshness) || 4,
          keywords,
          location,
          enableDetails,
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
          `Live scrape successful! Harvested ${extractedCount} verified jobs (${newCount} new to catalog). Catalog updated to ${total} total postings.`
        );
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-2">
            <Terminal className="w-3.5 h-3.5" />
            Ingestion Automation
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Live Scraper &amp; Ingestion Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Extract live job postings across LinkedIn, Naukri, and Indeed directly into the SQLite database and Supabase.
          </p>
        </div>

        {/* Top Download CSV Button */}
        <a
          href="/api/scraper/export?batch=latest"
          download="extracted_jobs.csv"
          data-testid="top-download-csv-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 shadow-md hover:border-slate-600 transition-all self-start md:self-auto shrink-0"
          title="Download all currently extracted jobs as CSV"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Download Last Scraped Batch
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scraper Configuration Form */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Configure Scrape Job</h2>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Extractor Ready
            </span>
          </div>

          {/* Sources */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Target Sourcing Platforms
              </label>
              <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                <button
                  type="button"
                  onClick={() => setSources(["LinkedIn"])}
                  className={`px-2 py-0.5 rounded transition-all font-medium border ${
                    sources.length === 1 && sources.includes("LinkedIn")
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold"
                      : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
                  }`}
                >
                  LinkedIn Only
                </button>
                <button
                  type="button"
                  onClick={() => setSources(["Naukri"])}
                  className={`px-2 py-0.5 rounded transition-all font-medium border ${
                    sources.length === 1 && sources.includes("Naukri")
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold"
                      : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
                  }`}
                >
                  Naukri Only
                </button>
                <button
                  type="button"
                  onClick={() => setSources(["Indeed"])}
                  className={`px-2 py-0.5 rounded transition-all font-medium border ${
                    sources.length === 1 && sources.includes("Indeed")
                      ? "bg-indigo-600 text-white border-indigo-500 font-bold"
                      : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
                  }`}
                >
                  Indeed Only
                </button>
                <button
                  type="button"
                  onClick={() => setSources(["LinkedIn", "Naukri", "Indeed"])}
                  className={`px-2 py-0.5 rounded transition-all font-medium border ${
                    sources.length === 3
                      ? "bg-slate-700 text-white border-slate-600 font-bold"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  All 3 Platforms
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              {["LinkedIn", "Naukri", "Indeed"].map((src) => {
                const active = sources.includes(src);
                return (
                  <button
                    key={src}
                    type="button"
                    data-testid={`scraper-src-${src.toLowerCase()}`}
                    onClick={() => toggleSource(src)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
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
            <p className="text-[11px] text-slate-400 mt-1">
              Active Scope:{" "}
              <span className="text-emerald-400 font-semibold">
                {sources.length === 0
                  ? "⚠️ Please select at least one platform"
                  : sources.length === 3
                  ? "All 3 platforms (LinkedIn, Naukri, Indeed)"
                  : `${sources.join(" + ")} only (unselected platforms will NOT be contacted)`}
              </span>
            </p>
          </div>

          {/* Search Time Range (in Hours) - Pure numeric input as requested */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Search Time Range (in Hours)
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
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-medium"
                placeholder="Enter number of hours (e.g. 4, 8, 12, 24, 72)"
              />
              <div className="absolute right-4 top-2.5 text-xs text-slate-500 pointer-events-none font-medium">
                Hours
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enter any hour value to precisely target jobs posted within that duration (e.g. <code className="text-indigo-300 font-mono bg-slate-800/80 px-1 py-0.5 rounded">4</code> for past 4 hours, <code className="text-indigo-300 font-mono bg-slate-800/80 px-1 py-0.5 rounded">8</code> for past 8 hours, <code className="text-indigo-300 font-mono bg-slate-800/80 px-1 py-0.5 rounded">24</code> for past 24 hours).
            </p>
          </div>

          {/* Target Location Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                Target Search Location
              </label>
              <span className="text-slate-400 text-[11px]">
                Active: <span className="text-white font-medium">{location || "India"}</span>
              </span>
            </div>
            <input
              type="text"
              data-testid="scrape-location-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-medium"
              placeholder="e.g. India, Bengaluru, Pune, Hyderabad, Remote"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Quick Cities:</span>
              {locationPresets.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc === "All India" ? "India" : loc)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all ${
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

          {/* Keywords */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Search Keywords (comma-separated)
              </label>
            </div>
            <input
              type="text"
              data-testid="scrape-keywords-input"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-medium"
              placeholder="e.g. Python developer, data analyst, AWS cloud engineer"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Suggested Roles:</span>
              {keywordPresets.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setKeywords(kw)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all ${
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

          {/* Full Page Enrichment Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Full Page Fetching (Rich Descriptions & Degrees)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Opens full job posting URLs to extract complete job descriptions and exact education/degree tables.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableDetails}
                onChange={(e) => setEnableDetails(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Scope Badge */}
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <div className="text-slate-300 leading-relaxed">
              <span className="text-emerald-400 font-bold">Comprehensive Live Harvesting:</span> Scrapes real-time matching jobs in <span className="text-white font-semibold">{location || "India"}</span> within your <span className="text-white font-semibold">{freshness} hour{freshness === 1 ? "" : "s"}</span> window across pages, cleans roles, and syncs directly to SQLite and CSV.
            </div>
          </div>

          {/* Status notification */}
          {status !== "idle" && (
            <div
              data-testid="scrape-status-banner"
              className={`p-4 rounded-xl text-xs flex flex-col gap-3 border ${
                status === "running"
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                  : status === "success"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {status === "running" && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />}
                  {status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {status === "error" && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  <span className="font-semibold">{statusMessage}</span>
                </div>

                {status === "success" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`/api/scraper/export?batch=latest&sources=${sources.join(",")}&freshness=${freshness}`}
                      download="latest_extracted_jobs.csv"
                      data-testid="banner-download-csv-btn"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Extracted CSV
                    </a>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      Explore All Jobs
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Platform breakdown card */}
              {status === "success" && bySourceStats && (
                <div className="grid grid-cols-3 gap-2.5 pt-1 border-t border-emerald-500/20">
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">LinkedIn</span>
                    <span className="text-base font-extrabold text-blue-400">
                      {bySourceStats["LinkedIn"] ?? bySourceStats["linkedin"] ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Naukri</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      {bySourceStats["Naukri"] ?? bySourceStats["naukri"] ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Indeed</span>
                    <span className="text-base font-extrabold text-indigo-400">
                      {bySourceStats["Indeed"] ?? bySourceStats["indeed"] ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sample Jobs Quick Preview */}
          {sampleJobs.length > 0 && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                  Extracted Jobs Preview ({sampleJobs.length} sample records)
                </span>
                <span className="text-[10px] text-slate-500">Synced to jobs.db</span>
              </div>
              <div className="divide-y divide-slate-800/60">
                {sampleJobs.map((job, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate">
                      <span className="font-bold text-slate-200 block truncate">{job.title}</span>
                      <span className="text-[11px] text-slate-400">{job.company} • {job.city || "India"}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.source === "LinkedIn" ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" :
                        job.source === "Naukri" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                        "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                      }`}>
                        {job.source}
                      </span>
                      {job.link && (
                        <a
                          href={job.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-white"
                          title="Open posting"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Console Output Terminal */}
          {logs.length > 0 && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-300 space-y-1 max-h-48 overflow-y-auto">
              <div className="text-slate-500 font-bold mb-2 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Live Scraper Output Stream
                </span>
                <span className="text-[10px] text-slate-500">{logs.length} events logged</span>
              </div>
              {logs.map((logLine, idx) => (
                <div key={idx} className="leading-relaxed font-mono">
                  {logLine.startsWith("[WARN]") ? (
                    <span className="text-amber-400">{logLine}</span>
                  ) : logLine.includes("Error") ? (
                    <span className="text-rose-400">{logLine}</span>
                  ) : logLine.includes("successfully") || logLine.includes("Accepted") ? (
                    <span className="text-emerald-400">{logLine}</span>
                  ) : (
                    <span className="text-slate-300">{logLine}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Trigger Button */}
          <button
            onClick={handleTriggerScrape}
            data-testid="dispatch-scrape-btn"
            disabled={status === "running"}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
              status === "running"
                ? "bg-slate-800 cursor-not-allowed opacity-80"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/30"
            }`}
          >
            {status === "running" ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Extracting Live Data From Web...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Dispatch Scraper Run
              </>
            )}
          </button>

          {/* Download CSV Action Bar directly below the trigger button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Download extracted jobs matching selected platforms &amp; time range:
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/api/scraper/export?batch=latest&sources=${sources.join(",")}&freshness=${freshness}`}
                download="latest_extracted_jobs.csv"
                data-testid="download-extracted-csv-btn"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 shadow-sm transition-all shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Download CSV (Recent Batch)
              </a>
              <a
                href="/api/scraper/export?batch=all"
                download="master_all_jobs.csv"
                className="text-xs text-slate-400 hover:text-slate-300 underline underline-offset-2"
              >
                Full Catalog
              </a>
            </div>
          </div>
        </div>

        {/* Info & Health Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Live Extractor Architecture
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When triggered, this studio directly invokes the production crawler pipeline:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-400" /> 1. Direct Web Harvesting
                </span>
                <p className="text-slate-400 text-[11px]">
                  Extracts live job cards, descriptions, salaries, and experience bounds from active Indian portals.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">2. ML Classification &amp; Deduplication</span>
                <p className="text-slate-400 text-[11px]">
                  Applies degree clustering, parses career tiers, and drops already seen duplicates.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">3. Instant Database Synchronization</span>
                <p className="text-slate-400 text-[11px]">
                  Appends new rows to SQLite and triggers Supabase cloud sync immediately.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Standalone Worker CLI:
            </div>
            <p className="text-slate-400 text-[11px] font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800 text-emerald-400">
              python pipeline/live_scrape_runner.py
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
