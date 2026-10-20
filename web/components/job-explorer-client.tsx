"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  MapPin,
  Building,
  Clock,
  GraduationCap,
  ArrowUpRight,
  Bookmark,
  Download,
  X,
  ExternalLink,
  Sparkles,
  ChevronDown,
  Layers,
  Award,
  AlertTriangle,
} from "lucide-react";
import type { UnifiedJobRecord } from "@/lib/taxonomy";
import { EDUCATION_TAXONOMY } from "@/lib/taxonomy";

const INDIAN_HUBS = [
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Mumbai",
  "Noida",
  "Gurugram",
  "Delhi NCR",
  "Kolkata",
  "Remote",
];

const CAREER_TIERS = [
  "Fresher & Entry (0 - 2 Yrs)",
  "Mid-Level (2 - 5 Yrs)",
  "Senior (5 - 8 Yrs)",
  "Staff & Lead (8+ Yrs)",
];

export function JobExplorerClient({
  initialJobs,
}: {
  initialJobs: UnifiedJobRecord[];
}) {
  const [search, setSearch] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "LinkedIn",
    "Naukri",
    "Indeed",
  ]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [minExp, setMinExp] = useState<number>(0);
  const [maxExp, setMaxExp] = useState<number>(15);
  const [selectedHub, setSelectedHub] = useState<string>("");
  const [selectedCluster, setSelectedCluster] = useState<string>("");
  const [selectedSubcluster, setSelectedSubcluster] = useState<string>("");
  const [selectedDegree, setSelectedDegree] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(true);
  const [activeJobModal, setActiveJobModal] = useState<UnifiedJobRecord | null>(
    null
  );
  const [savedJobs, setSavedJobs] = useState<Record<string, boolean>>({});

  // Sync saved jobs with localStorage on mount
  useEffect(() => {
    try {
      const local = localStorage.getItem("job_intel_saved_pipeline");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const map: Record<string, boolean> = {};
          for (const item of parsed) {
            if (item.job_id) map[item.job_id] = true;
          }
          setSavedJobs(map);
        }
      }
    } catch (e) {}
  }, []);

  // Available sources
  const allSources = useMemo(
    () => Array.from(new Set(initialJobs.map((j) => j.source).filter(Boolean))),
    [initialJobs]
  );

  // Available subclusters based on selected cluster
  const availableSubclusters = useMemo(() => {
    if (selectedCluster && EDUCATION_TAXONOMY[selectedCluster]) {
      return Object.keys(EDUCATION_TAXONOMY[selectedCluster]);
    }
    const all: string[] = [];
    for (const subs of Object.values(EDUCATION_TAXONOMY)) {
      for (const s of Object.keys(subs)) {
        if (!all.includes(s)) all.push(s);
      }
    }
    return all;
  }, [selectedCluster]);

  // Filtered jobs calculation
  const filteredJobs = useMemo(() => {
    return initialJobs.filter((job) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const blob = `${job.title} ${job.company} ${job.skills} ${job.normalized_location} ${job.degree_required} ${job.full_description} ${job.search_keyword}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }

      // Source
      if (
        selectedSources.length > 0 &&
        !selectedSources.includes(job.source)
      ) {
        return false;
      }

      // Career Tier
      if (
        selectedTiers.length > 0 &&
        !selectedTiers.includes(job.career_tier)
      ) {
        return false;
      }

      // Min/Max Experience bounds
      const jobExp = job.min_exp_num ?? 0;
      if (jobExp < minExp || jobExp > maxExp) {
        return false;
      }

      // Hub
      if (selectedHub) {
        if (
          !job.normalized_location
            .toLowerCase()
            .includes(selectedHub.toLowerCase())
        ) {
          return false;
        }
      }

      // Education Cluster
      if (selectedCluster && job.edu_cluster !== selectedCluster) {
        return false;
      }

      // Education Subcluster
      if (selectedSubcluster && job.edu_subcluster !== selectedSubcluster) {
        return false;
      }

      // Specific Degree
      if (selectedDegree) {
        if (
          !job.edu_degrees ||
          !job.edu_degrees.some((d) =>
            d.toLowerCase().includes(selectedDegree.toLowerCase())
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    initialJobs,
    search,
    selectedSources,
    selectedTiers,
    minExp,
    maxExp,
    selectedHub,
    selectedCluster,
    selectedSubcluster,
    selectedDegree,
  ]);

  // Top KPIs matching Streamlit dashboard
  const totalVerified = initialJobs.length;
  const uniqueCompanies = useMemo(
    () =>
      new Set(
        initialJobs
          .map((j) => j.company)
          .filter((c) => c && c !== "Not Specified")
      ).size,
    [initialJobs]
  );

  const topCity = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of initialJobs) {
      if (j.normalized_location && j.normalized_location !== "India (Not Specified)") {
        counts[j.normalized_location] = (counts[j.normalized_location] || 0) + 1;
      }
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0].split(",")[0] : "Bengaluru";
  }, [initialJobs]);

  const avgExp = useMemo(() => {
    const valid = initialJobs
      .map((j) => j.min_exp_num)
      .filter((n): n is number => n !== null);
    if (!valid.length) return "N/A";
    const sum = valid.reduce((a, b) => a + b, 0);
    return `${(sum / valid.length).toFixed(1)} Yrs`;
  }, [initialJobs]);

  const toggleSource = (src: string) => {
    setSelectedSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  };

  const toggleTier = (tier: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  };

  const handleExportCsv = () => {
    if (!filteredJobs.length) return;
    const headers = [
      "job_id",
      "source",
      "title",
      "company",
      "min_experience_years",
      "max_experience_years",
      "career_tier",
      "normalized_location",
      "skills",
      "degree_required",
      "edu_cluster",
      "edu_subcluster",
      "collected_at",
      "link",
    ];
    const csvRows = [headers.join(",")];

    for (const j of filteredJobs) {
      const row = [
        `"${j.job_id}"`,
        `"${j.source}"`,
        `"${(j.title || "").replace(/"/g, '""')}"`,
        `"${(j.company || "").replace(/"/g, '""')}"`,
        `"${j.min_experience_years}"`,
        `"${j.max_experience_years}"`,
        `"${j.career_tier}"`,
        `"${(j.normalized_location || "").replace(/"/g, '""')}"`,
        `"${(j.skills || "").replace(/"/g, '""')}"`,
        `"${(j.degree_required || "").replace(/"/g, '""')}"`,
        `"${j.edu_cluster || ""}"`,
        `"${j.edu_subcluster || ""}"`,
        `"${j.collected_at}"`,
        `"${j.link}"`,
      ];
      csvRows.push(row.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job_explorer_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSave = (job: UnifiedJobRecord) => {
    const isNowSaved = !savedJobs[job.job_id];
    setSavedJobs((prev) => ({ ...prev, [job.job_id]: isNowSaved }));

    try {
      const local = localStorage.getItem("job_intel_saved_pipeline");
      let list: any[] = [];
      if (local) {
        try {
          list = JSON.parse(local) || [];
        } catch {
          list = [];
        }
      }
      if (isNowSaved) {
        if (!list.some((x) => x.job_id === job.job_id)) {
          list.unshift({
            job_id: job.job_id,
            title: job.title,
            company: job.company,
            location: job.normalized_location,
            source: job.source,
            link: job.link,
            min_exp: job.min_exp_num,
            max_exp: job.max_exp_num,
            career_tier: job.career_tier,
            status: "saved",
            notes: "",
            saved_at: new Date().toISOString(),
          });
        }
      } else {
        list = list.filter((x) => x.job_id !== job.job_id);
      }
      localStorage.setItem("job_intel_saved_pipeline", JSON.stringify(list));
    } catch (e) {}
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-8 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Pan-India Tech Talent Sourcing
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Job Explorer &amp; Application Workbench
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              High-precision talent intelligence across LinkedIn, Naukri, and Indeed. Filter by dual experience bounds, premier IT hubs, and education taxonomy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              data-testid="export-csv-btn"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition-all shadow-md"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              Export CSV ({filteredJobs.length})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (Matching Streamlit Dashboard Top Metric Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-indigo-500 shadow-md">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Catalog Postings
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {totalVerified.toLocaleString()}
          </div>
          <div className="text-xs text-indigo-400 font-medium mt-0.5">
            Aggregated across 3 platforms
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-emerald-500 shadow-md">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Employers
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {uniqueCompanies.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-400 font-medium mt-0.5">
            Verified enterprise orgs
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-violet-500 shadow-md">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Top Talent Hub
          </div>
          <div className="text-2xl font-black text-white mt-1">{topCity}</div>
          <div className="text-xs text-violet-400 font-medium mt-0.5">
            Silicon Plateau concentration
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-amber-500 shadow-md">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Avg Required Exp
          </div>
          <div className="text-2xl font-black text-white mt-1">{avgExp}</div>
          <div className="text-xs text-amber-400 font-medium mt-0.5">
            Core mid-senior band
          </div>
        </div>
      </div>

      {/* Control Strip & Filters */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 space-y-6 shadow-xl">
        {/* Search Bar & Sourcing Platforms */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-testid="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title, company, skills (e.g. Python, AWS, Snowflake)..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs text-slate-400 font-semibold mr-1">
              Platforms:
            </span>
            {allSources.map((src) => {
              const isSelected = selectedSources.includes(src);
              return (
                <button
                  key={src}
                  data-testid={`source-${src.toLowerCase()}`}
                  onClick={() => toggleSource(src)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {src}
                </button>
              );
            })}
          </div>
        </div>

        {/* Experience Dual Bounds & Career Tiers */}
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Min & Max Experience Selectors */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Experience Range</span>
              <span className="text-indigo-400 font-extrabold normal-case">
                {minExp} Yrs — {maxExp} Yrs
              </span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-[11px] text-slate-500 mb-1 block">Min Exp:</span>
                <input
                  type="number"
                  data-testid="min-exp-input"
                  min="0"
                  max="15"
                  value={minExp}
                  onChange={(e) => setMinExp(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm"
                />
              </div>
              <div className="text-slate-600 font-bold pt-4">—</div>
              <div className="flex-1">
                <span className="text-[11px] text-slate-500 mb-1 block">Max Exp:</span>
                <input
                  type="number"
                  data-testid="max-exp-input"
                  min="0"
                  max="20"
                  value={maxExp}
                  onChange={(e) => setMaxExp(Number(e.target.value) || 20)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Career Tiers */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Indian Tech Career Tiers
            </label>
            <div className="flex flex-wrap gap-2">
              {CAREER_TIERS.map((tier) => {
                const isSelected = selectedTiers.includes(tier);
                const tierKey = tier.includes("0 - 2")
                  ? "fresher"
                  : tier.includes("2 - 5")
                  ? "mid"
                  : tier.includes("5 - 8")
                  ? "senior"
                  : "lead";
                return (
                  <button
                    key={tier}
                    data-testid={`tier-${tierKey}`}
                    onClick={() => toggleTier(tier)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/30"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Indian Tech Hub Filter Strip */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            Top IT Hubs:
          </span>
          <button
            onClick={() => setSelectedHub("")}
            data-testid="hub-all"
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedHub === ""
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All India
          </button>
          {INDIAN_HUBS.map((hub) => (
            <button
              key={hub}
              data-testid={`hub-${hub.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setSelectedHub(hub === selectedHub ? "" : hub)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedHub === hub
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {hub}
            </button>
          ))}
        </div>

        {/* Advanced Education & Degree Clustering Form (From Streamlit Dashboard) */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <GraduationCap className="w-4 h-4 text-violet-400" />
              <span>Education &amp; Degree Clustering Hierarchy</span>
            </div>
            {(selectedCluster || selectedSubcluster || selectedDegree) && (
              <button
                onClick={() => {
                  setSelectedCluster("");
                  setSelectedSubcluster("");
                  setSelectedDegree("");
                }}
                className="text-xs text-indigo-400 hover:underline font-semibold"
              >
                Clear Education Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cluster Tier */}
            <div>
              <span className="text-[11px] text-slate-500 mb-1 block font-medium">
                1. Macro Cluster Tier:
              </span>
              <select
                value={selectedCluster}
                onChange={(e) => {
                  setSelectedCluster(e.target.value);
                  setSelectedSubcluster("");
                  setSelectedDegree("");
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Education Clusters</option>
                {Object.keys(EDUCATION_TAXONOMY).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcluster Track */}
            <div>
              <span className="text-[11px] text-slate-500 mb-1 block font-medium">
                2. Specific Track / Sub-Cluster:
              </span>
              <select
                value={selectedSubcluster}
                onChange={(e) => setSelectedSubcluster(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Tracks</option>
                {availableSubclusters.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Specific Degree Input */}
            <div>
              <span className="text-[11px] text-slate-500 mb-1 block font-medium">
                3. Degree Keyword (e.g. B.Tech, MCA):
              </span>
              <input
                type="text"
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                placeholder="B.Tech, B.E., BCA, MCA, M.Tech..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Job Postings Grid / List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
          <div>
            Showing <strong className="text-white">{filteredJobs.length}</strong> postings
          </div>
          <div>Sort by: Most Recent First</div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500 space-y-2">
            <p className="text-base font-bold text-slate-400">
              No matching job opportunities found
            </p>
            <p className="text-xs">
              Try adjusting your experience limits or clear active filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.slice(0, 40).map((job) => {
              const isSaved = !!savedJobs[job.job_id];
              return (
                <div
                  key={job.job_id}
                  className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-5 hover:border-slate-700 hover:bg-slate-900 transition-all shadow-md group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            {job.source}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {job.career_tier}
                          </span>
                          {job.edu_cluster && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                              {job.edu_cluster.split("/")[0].trim()}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-base group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {job.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                          <Building className="w-3.5 h-3.5 text-slate-500" />
                          {job.company}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleSave(job)}
                        className={`p-2 rounded-lg border transition-colors ${
                          isSaved
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                        }`}
                        title="Save Job"
                        aria-label="Save Job"
                        data-testid={`save-job-${job.job_id}`}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {job.exp_display || "Exp Not Specified"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {job.normalized_location}
                      </span>
                      {job.degree_required &&
                        job.degree_required !== "Not Specified" && (
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
                            {job.degree_required}
                          </span>
                        )}
                    </div>

                    {/* Extracted Skills */}
                    {job.skills && job.skills !== "Not Specified" && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.skills
                          .split(/[,|;]/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .slice(0, 4)
                          .map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                            >
                              {skill}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => setActiveJobModal(job)}
                      data-testid="inspect-job-btn"
                      className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      Inspect Description ➔
                    </button>

                    <a
                      href={job.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                    >
                      Apply Now <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inspection Modal / Drawer (Matching Streamlit Job Inspection Drawer) */}
      {activeJobModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/50">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {activeJobModal.source} Post
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  {activeJobModal.title}
                </h2>
                <p className="text-sm font-semibold text-indigo-400 mt-0.5">
                  🏢 {activeJobModal.company} &nbsp;•&nbsp; 📍{" "}
                  {activeJobModal.normalized_location}
                </p>
              </div>

              <button
                onClick={() => setActiveJobModal(null)}
                data-testid="close-modal-btn"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-300 text-sm leading-relaxed">
              {/* Badges Strip matching Streamlit drawer */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
                  ⏳ Exp: {activeJobModal.exp_display || "Not Specified"}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 font-semibold">
                  🎓 Cluster: {activeJobModal.edu_cluster || "Undergraduate"}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  📚 Track: {activeJobModal.edu_subcluster || "Tech & Engineering"}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  🎯 Degrees: {activeJobModal.degree_required || "Not Specified"}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-semibold">
                  🔍 Keyword: {activeJobModal.search_keyword}
                </span>
              </div>

              {/* Experience Review Note (Amber Alert Note from Streamlit line 916) */}
              {activeJobModal.experience_review &&
                !["not specified", "none", "nan", ""].includes(
                  activeJobModal.experience_review.trim().toLowerCase()
                ) && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-200">
                        Experience Review Note:
                      </strong>
                      <span>{activeJobModal.experience_review}</span>
                    </div>
                  </div>
                )}

              {/* Extracted Skills */}
              {activeJobModal.skills && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    🛠️ Extracted Skills:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeJobModal.skills.split(/[,|;]/).map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 text-xs font-medium"
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Job Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  📄 Full Job Description:
                </h4>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-96 overflow-y-auto text-slate-300">
                  {activeJobModal.full_description}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Job ID: {activeJobModal.job_id}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveJobModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <a
                  href={activeJobModal.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  Apply Directly <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
