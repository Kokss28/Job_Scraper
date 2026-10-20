"use client";

import { useState } from "react";
import Link from "next/link";
import { Terminal, Play, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, Database, Download, FileSpreadsheet } from "lucide-react";

export default function ScraperStudioPage() {
  const [sources, setSources] = useState<string[]>(["LinkedIn", "Naukri", "Indeed"]);
  const [freshness, setFreshness] = useState<number>(24);
  const [keywords, setKeywords] = useState<string>("Python developer, data engineer");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [resultStats, setResultStats] = useState<{ newJobs: number; totalJobs: number; extractedJobs?: number } | null>(null);

  const toggleSource = (src: string) => {
    setSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  };

  const handleTriggerScrape = async () => {
    if (sources.length === 0) {
      alert("Please select at least one platform.");
      return;
    }
    setStatus("running");
    setStatusMessage("Executing live scraping run across selected platforms...");
    setLogs(["Connecting to live scraper engine...", "Dispatching crawler process..."]);
    setResultStats(null);

    try {
      const res = await fetch("/api/scraper/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources,
          freshness,
          keywords,
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
          Download Extracted Jobs (CSV)
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scrape Controls Card */}
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

          {/* Manual Posting Freshness Window */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Search Time Range (in Hours)
              </label>
              <span className="text-indigo-400 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30">
                Past {freshness} Hour{freshness === 1 ? "" : "s"}
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
                  setFreshness(isNaN(val) ? 24 : Math.max(1, val));
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-medium"
                placeholder="Enter number of hours (e.g. 1, 6, 24, 72)"
              />
              <div className="absolute right-4 top-2.5 text-xs text-slate-500 pointer-events-none font-medium">
                Hours
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enter any number of hours to fetch jobs posted within that timeframe (e.g., <code className="text-indigo-300 font-mono bg-slate-800/80 px-1 py-0.5 rounded">1</code> for past hour, <code className="text-indigo-300 font-mono bg-slate-800/80 px-1 py-0.5 rounded">6</code> for past 6 hours, <code className="text-indigo-300 font-mono bg-slate-800/80 px-1 py-0.5 rounded">24</code> for past 24 hours, <code className="text-indigo-300 font-mono bg-slate-800/80 px-1 py-0.5 rounded">72</code> for past 72 hours). Calculates the dynamic time cutoff from the current moment.
            </p>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Search Keywords (comma-separated)
            </label>
            <input
              type="text"
              data-testid="scrape-keywords-input"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Python developer, data analyst, AWS cloud engineer"
            />
          </div>

          {/* Unlimited Job Scope Badge (Max Job Limit Removed) */}
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <div className="text-slate-300 leading-relaxed">
              <span className="text-emerald-400 font-bold">Comprehensive Extraction (No Fixed Job Limit):</span> The engine retrieves all accessible matching jobs within your specified <span className="text-white font-semibold">{freshness} hour{freshness === 1 ? "" : "s"}</span> window across pages until all current listings are exhausted, while removing duplicates.
            </div>
          </div>

          {/* Status notification */}
          {status !== "idle" && (
            <div
              data-testid="scrape-status-banner"
              className={`p-4 rounded-xl text-xs flex flex-col gap-2 border ${
                status === "running"
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                  : status === "success"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
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
                      Download Extracted Jobs (CSV)
                    </a>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      Explore Newly Scraped Jobs
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
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
