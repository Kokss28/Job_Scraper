"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Search,
  MapPin,
  Calendar,
  Building2,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  FileCheck2,
  Filter,
  LogOut,
  User,
  Shield,
  Layers,
  Check,
  AlertCircle,
  Eye,
  Send,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Tag,
  DollarSign,
  Globe,
  Lock,
} from "lucide-react";
import type { PortalUser } from "@/lib/portal-db";

type JobItem = {
  job_id: string;
  source: string;
  title: string;
  company: string;
  city: string;
  state: string;
  country: string;
  min_experience_years: string;
  max_experience_years: string;
  skills: string;
  degree_required: string;
  collected_at: string;
  link: string;
  isApplied: boolean;
  deadline: string;
  job_type: string;
  salary: string;
  posted_ago?: string;
  posted_date?: string;
  hiring_status?: string;
  normalized_location?: string;
  exp_display?: string;
};

// 1. Format Location Cleanly (handles missing/Not Specified values)
function formatJobLocation(job: JobItem): string {
  const city = (job.city || "").trim();
  const state = (job.state || "").trim();

  const isInvalidCity = !city || city.toLowerCase() === "not specified" || city.toLowerCase() === "unknown";
  const isInvalidState = !state || state.toLowerCase() === "not specified" || state.toLowerCase() === "unknown";

  if (!isInvalidCity && !isInvalidState) {
    return city.toLowerCase() === state.toLowerCase() ? city : `${city}, ${state}`;
  }
  if (!isInvalidCity) return city;
  if (!isInvalidState) return `${state}, India`;
  if (job.normalized_location && !job.normalized_location.toLowerCase().includes("not specified")) {
    return job.normalized_location;
  }
  return "Pan-India / Remote";
}

// 2. Format Qualification / Degree Cleanly
function formatJobDegree(degree: string | undefined): string {
  if (!degree) return "Tech Graduate";
  const d = degree.trim();
  if (d.toLowerCase() === "not specified" || d.toLowerCase() === "unknown") {
    return "Tech Graduate";
  }
  if (d.toLowerCase().includes("any bachelor's") || d.toLowerCase().includes("any master's")) {
    return "Bachelor's / Master's";
  }
  if (d.length > 26) {
    return d.substring(0, 24) + "...";
  }
  return d;
}

// 3. Format Experience Cleanly
function formatJobExperience(job: JobItem): string {
  const min = (job.min_experience_years || "").trim();
  const max = (job.max_experience_years || "").trim();

  const isMinValid = min && min.toLowerCase() !== "not specified" && min.toLowerCase() !== "unknown";
  const isMaxValid = max && max.toLowerCase() !== "not specified" && max.toLowerCase() !== "unknown";

  if (isMinValid && isMaxValid) {
    return `${min} - ${max} Yrs Exp`;
  }
  if (isMinValid) {
    const num = parseFloat(min);
    if (!isNaN(num) && num === 0) return "Fresher (0-1 Yr)";
    return `${min}+ Yrs Exp`;
  }
  if (job.exp_display && !job.exp_display.toLowerCase().includes("not specified")) {
    return job.exp_display;
  }
  return "0-2 Yrs / All Exp";
}

// 4. Extract and Clean Skills Tags (Filtering out giant paragraphs, markdown asterisks, bullet points)
const COMMON_TECH_KEYWORDS = [
  "Java", "Python", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "Spring", "AWS",
  "Docker", "Kubernetes", "Git", "C++", "C#", ".NET", "Golang", "Angular", "Vue", "DSA",
  "HTML", "CSS", "Next.js", "Django", "FastAPI", "Flask", "Kafka", "Redis", "MongoDB",
  "PostgreSQL", "MySQL", "Azure", "GCP", "Linux", "REST APIs", "Microservices", "GraphQL",
  "AI", "Machine Learning", "LLMs", "NLP", "Pandas", "PySpark", "CI/CD", "DevOps"
];

function extractCleanSkills(job: JobItem): string[] {
  const rawSkills = job.skills || "";
  const candidates: string[] = [];

  const parts = rawSkills.split(/[,;\n•]+/).map((p) => p.trim());

  for (const part of parts) {
    const cleaned = part.replace(/[*_#`~"']/g, "").trim();
    if (
      cleaned.length >= 2 &&
      cleaned.length <= 22 &&
      !cleaned.includes(":") &&
      !cleaned.toLowerCase().includes("experience") &&
      !cleaned.toLowerCase().includes("knowledge") &&
      !cleaned.toLowerCase().includes("demonstrate") &&
      !cleaned.toLowerCase().includes("ability to") &&
      !cleaned.toLowerCase().includes("preferred") &&
      !cleaned.toLowerCase().includes("candidate") &&
      !cleaned.toLowerCase().includes("degree") &&
      !cleaned.toLowerCase().includes("qualifications")
    ) {
      if (!candidates.includes(cleaned)) {
        candidates.push(cleaned);
      }
    }
  }

  if (candidates.length >= 2) {
    return candidates.slice(0, 4);
  }

  const combinedText = `${job.title} ${rawSkills}`;
  for (const kw of COMMON_TECH_KEYWORDS) {
    const regex = new RegExp(`\\b${kw.replace("+", "\\+")}\\b`, "i");
    if (regex.test(combinedText) && !candidates.includes(kw)) {
      candidates.push(kw);
      if (candidates.length >= 4) break;
    }
  }

  if (candidates.length > 0) {
    return candidates.slice(0, 4);
  }

  const titleWords = job.title
    .split(/[\s/|-]+/)
    .filter(
      (w) =>
        w.length > 2 &&
        ![
          "senior",
          "junior",
          "lead",
          "staff",
          "associate",
          "intern",
          "developer",
          "engineer",
          "trainer",
          "the",
          "and",
          "for",
          "with",
        ].includes(w.toLowerCase())
    );
  return titleWords.slice(0, 3);
}

// 5. Source Branding Helper
function getSourceBadge(source: string) {
  const s = (source || "").toLowerCase().trim();
  if (s.includes("linkedin")) {
    return {
      label: "LinkedIn",
      className: "bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20 font-bold",
      dotColor: "bg-[#0A66C2]",
    };
  }
  if (s.includes("naukri")) {
    return {
      label: "Naukri",
      className: "bg-blue-50 text-blue-800 border-blue-200 font-bold",
      dotColor: "bg-blue-700",
    };
  }
  if (s.includes("indeed")) {
    return {
      label: "Indeed",
      className: "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold",
      dotColor: "bg-indigo-600",
    };
  }
  return {
    label: source || "Direct Recruiter",
    className: "bg-slate-100 text-slate-700 border-slate-200 font-bold",
    dotColor: "bg-slate-500",
  };
}

type ApplicationItem = {
  application_id: string;
  job_id: string;
  application_date: string;
  application_status: string;
  notes?: string;
  job_title?: string;
  job_company?: string;
};

export function PortalDashboard() {
  const router = useRouter();

  // User State
  const [user, setUser] = useState<PortalUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Jobs State
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [totalCatalogCount, setTotalCatalogCount] = useState(11819);
  const [totalAppliedCount, setTotalAppliedCount] = useState(0);
  const [todayAppliedCount, setTodayAppliedCount] = useState(0);
  const [dailyApplyLimit, setDailyApplyLimit] = useState(10);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("All India");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedSource, setSelectedSource] = useState("All Sources");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal State
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [jobDescription, setJobDescription] = useState<string | null>(null);
  const [isLoadingDesc, setIsLoadingDesc] = useState(false);

  // Applications History Modal State
  const [showMyApplications, setShowMyApplications] = useState(false);
  const [applicationsList, setApplicationsList] = useState<ApplicationItem[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  // Apply Modal State
  const [applyingJob, setApplyingJob] = useState<JobItem | null>(null);
  const [applicationNotes, setApplicationNotes] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [appFeedback, setAppFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch Current User
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        setTotalAppliedCount(data.totalApplied || 0);
        setTodayAppliedCount(data.todayApplied || 0);
        setDailyApplyLimit(data.dailyApplyLimit !== undefined ? data.dailyApplyLimit : (data.user?.daily_apply_limit ?? 10));
        setIsDailyLimitReached(Boolean(data.isDailyLimitReached));
        setAppliedJobIds(data.appliedJobIds || []);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    } finally {
      setIsLoadingUser(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Fetch Jobs
  const fetchJobs = useCallback(async (targetPage = 1, overrideSource?: string) => {
    setIsLoadingJobs(true);
    try {
      const activeSource = overrideSource !== undefined ? overrideSource : selectedSource;
      const queryParams = new URLSearchParams({
        page: String(targetPage),
        pageSize: "12",
      });

      if (searchQuery.trim()) queryParams.set("query", searchQuery.trim());
      if (selectedCity && selectedCity !== "All India") queryParams.set("city", selectedCity);
      if (selectedCategory && selectedCategory !== "All Categories") {
        queryParams.set("skill", selectedCategory);
      }
      if (activeSource && !activeSource.toLowerCase().includes("all")) {
        queryParams.set("source", activeSource);
      }

      const res = await fetch(`/api/portal/jobs?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load jobs");

      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || 1);
        if (data.totalCatalogCount) setTotalCatalogCount(data.totalCatalogCount);
        if (data.totalAppliedCount !== undefined) setTotalAppliedCount(data.totalAppliedCount);
        if (data.todayAppliedCount !== undefined) setTodayAppliedCount(data.todayAppliedCount);
        if (data.dailyApplyLimit !== undefined) setDailyApplyLimit(data.dailyApplyLimit);
        if (data.isDailyLimitReached !== undefined) setIsDailyLimitReached(Boolean(data.isDailyLimitReached));
      }
    } catch (e) {
      console.error("Error loading jobs:", e);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [searchQuery, selectedCity, selectedCategory, selectedSource]);

  const handleSelectSource = (src: string) => {
    setSelectedSource(src);
    setPage(1);
    fetchJobs(1, src);
  };

  useEffect(() => {
    if (!isLoadingUser && user) {
      fetchJobs(1);
    }
  }, [isLoadingUser, user, fetchJobs]);

  // Open Job Details Modal
  const handleViewJobDetails = async (job: JobItem) => {
    setSelectedJob(job);
    setIsLoadingDesc(true);
    setJobDescription(null);
    try {
      const res = await fetch(`/api/portal/jobs/${encodeURIComponent(job.job_id)}`);
      const data = await res.json();
      if (data.success && data.full_description) {
        setJobDescription(data.full_description);
      } else {
        setJobDescription("Full job description details are specified by the hiring enterprise upon submission.");
      }
    } catch {
      setJobDescription("Unable to load full job description at this time.");
    } finally {
      setIsLoadingDesc(false);
    }
  };

  // 1. Direct Apply to Job: Opens official source link in new tab and tracks application
  const handleApplyToJob = async (job: JobItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Check if daily limit reached
    if (isDailyLimitReached && !appliedJobIds.includes(job.job_id)) {
      alert(`Daily application quota reached (${dailyApplyLimit}/${dailyApplyLimit} jobs applied today). Verified Job Openings are locked for today. Your quota automatically resets tomorrow.`);
      return;
    }

    // 1. Resolve original application link
    let targetUrl = (job.link || "").trim();
    if (!targetUrl || !targetUrl.startsWith("http")) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(
        `${job.title} ${job.company} careers apply`
      )}`;
    }

    // 2. Open official source page in a new tab immediately
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }

    // 3. Mark locally as applied immediately
    if (!appliedJobIds.includes(job.job_id)) {
      setAppliedJobIds((prev) => [...prev, job.job_id]);
      setTotalAppliedCount((prev) => prev + 1);
      const nextTodayCount = todayAppliedCount + 1;
      setTodayAppliedCount(nextTodayCount);
      if (dailyApplyLimit > 0 && nextTodayCount >= dailyApplyLimit) {
        setIsDailyLimitReached(true);
      }
      setJobs((prev) =>
        prev.map((j) => (j.job_id === job.job_id ? { ...j, isApplied: true } : j))
      );

      // 4. Record in database in background (graceful, non-blocking)
      try {
        await fetch("/api/portal/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: job.job_id,
            userId: user?.user_id,
            notes: "Applied via original portal link",
          }),
        });
      } catch (err) {
        console.warn("Background application recording:", err);
      }
    }
  };

  // Open Apply Confirmation Modal (Optional Note)
  const handleOpenApply = (job: JobItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAppFeedback(null);
    setApplicationNotes("");
    setApplyingJob(job);
  };

  // Submit Job Application from Modal
  const handleSubmitApplication = async () => {
    if (!applyingJob) return;

    if (isDailyLimitReached && !appliedJobIds.includes(applyingJob.job_id)) {
      setAppFeedback({
        type: "error",
        message: `Daily application quota reached (${dailyApplyLimit}/${dailyApplyLimit} jobs applied today). Verified Job Openings are locked for today.`,
      });
      return;
    }

    setIsSubmittingApp(true);
    setAppFeedback(null);

    // 1. Open original link immediately
    let targetUrl = (applyingJob.link || "").trim();
    if (!targetUrl || !targetUrl.startsWith("http")) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(
        `${applyingJob.title} ${applyingJob.company} careers apply`
      )}`;
    }
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }

    // 2. Mark locally as applied
    if (!appliedJobIds.includes(applyingJob.job_id)) {
      const nextTodayCount = todayAppliedCount + 1;
      setTodayAppliedCount(nextTodayCount);
      if (dailyApplyLimit > 0 && nextTodayCount >= dailyApplyLimit) {
        setIsDailyLimitReached(true);
      }
    }
    setAppliedJobIds((prev) => (prev.includes(applyingJob.job_id) ? prev : [...prev, applyingJob.job_id]));
    setTotalAppliedCount((prev) => (appliedJobIds.includes(applyingJob.job_id) ? prev : prev + 1));
    setJobs((prev) =>
      prev.map((j) => (j.job_id === applyingJob.job_id ? { ...j, isApplied: true } : j))
    );

    // 3. Record in database
    try {
      await fetch("/api/portal/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: applyingJob.job_id,
          userId: user?.user_id,
          notes: applicationNotes.trim() || "Applied via original portal link",
        }),
      });

      setAppFeedback({
        type: "success",
        message: "Opening original job portal... Application marked as Applied!",
      });

      setTimeout(() => {
        setApplyingJob(null);
        setAppFeedback(null);
      }, 1000);
    } catch {
      setApplyingJob(null);
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Fetch My Applications
  const handleOpenMyApplications = async () => {
    setShowMyApplications(true);
    setIsLoadingApps(true);
    try {
      const res = await fetch("/api/portal/applications");
      const data = await res.json();
      if (data.success) {
        // Enrich application items with matching job metadata from current view or fallback
        const enriched = (data.applications || []).map((app: any) => {
          const matched = jobs.find((j) => j.job_id === app.job_id);
          return {
            ...app,
            job_title: matched?.title || "Software Engineering Role",
            job_company: matched?.company || "Verified Hiring Enterprise",
          };
        });
        setApplicationsList(enriched);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingApps(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch("/api/portal/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
    router.refresh();
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Verifying Portal Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* ========================================================= */}
      {/* 1. TOP NAVIGATION & USER WELCOME BAR                      */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-black text-slate-900 tracking-tight leading-none">
                TalentPulse
              </div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5">
                Candidate Job Portal
              </div>
            </div>
          </div>

          {/* User Controls & Navigation */}
          <div className="flex items-center gap-3">
            {/* View Applications History Button */}
            <button
              type="button"
              onClick={handleOpenMyApplications}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
            >
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              <span>My Applications</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px]">
                {totalAppliedCount}
              </span>
            </button>

            {/* User Profile Capsule */}
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {user?.full_name?.charAt(0) || "U"}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.full_name}
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">
                  {user?.qualification || "Candidate User"}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. DASHBOARD OVERVIEW & HERO SECTION                      */}
      {/* ========================================================= */}
      <main className="w-full px-4 sm:px-6 md:px-8 lg:px-10 pt-6 space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 md:p-8 shadow-xs relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Candidate Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Welcome back, {user?.full_name}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 max-w-2xl">
                Explore real-time opportunities verified across top recruiters. Review qualification matches and submit applications directly.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {user?.data_scope_hours && user.data_scope_hours !== "all" ? (
                <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Last {user.data_scope_hours}h Openings</span>
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-600" />
                  <span>Full Live Catalog</span>
                </span>
              )}

              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Portal Live Sync Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. FOUR DASHBOARD STATISTICS CARDS                        */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Available Jobs */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs border-t-4 border-t-indigo-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Total Available Jobs</span>
              <Briefcase className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {totalCatalogCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {user?.data_scope_hours && user.data_scope_hours !== "all"
                ? `Active in last ${user.data_scope_hours}h window`
                : "Active postings across India"}
            </div>
          </div>

          {/* Card 2: Total Applied Jobs & Daily Quota */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs border-t-4 border-t-emerald-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Total Applied Jobs</span>
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 text-emerald-600">
                {totalAppliedCount}
              </div>
              {dailyApplyLimit > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isDailyLimitReached
                      ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {isDailyLimitReached ? "🔒 Quota Full" : `${todayAppliedCount}/${dailyApplyLimit} Today`}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {dailyApplyLimit > 0
                ? isDailyLimitReached
                  ? `Daily quota reached (${todayAppliedCount}/${dailyApplyLimit} today)`
                  : `${Math.max(0, dailyApplyLimit - todayAppliedCount)} slots remaining today`
                : "Unlimited daily applications allowed"}
            </div>
          </div>

          {/* Card 3: Actively Hiring Companies */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs border-t-4 border-t-amber-500">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Actively Hiring Companies</span>
              <Building2 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {user?.data_scope_hours && user.data_scope_hours !== "all"
                ? `${Math.max(15, Math.round(totalCatalogCount * 0.28))}+`
                : "850+"}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {user?.data_scope_hours && user.data_scope_hours !== "all"
                ? "Direct Employers in your window"
                : "Verified direct employers pan-India"}
            </div>
          </div>

          {/* Card 4: Available Job Categories */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs border-t-4 border-t-violet-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Available Categories</span>
              <Layers className="w-4 h-4 text-violet-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              6 Domains
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              Python, Data, Java, Cloud, AI
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. SEARCH & FILTER CONTROLS                               */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs by title, company, or skills..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
              />
            </div>

            {/* City Filter */}
            <div className="w-full md:w-52">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-semibold text-slate-700 outline-hidden transition-all cursor-pointer"
              >
                <option value="All India">📍 All India Locations</option>
                <option value="Chennai">Chennai</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Delhi">Delhi / NCR</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-52">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-semibold text-slate-700 outline-hidden transition-all cursor-pointer"
              >
                <option value="All Categories">💼 All Categories</option>
                <option value="Python">Python Development</option>
                <option value="Data">Data &amp; Analytics</option>
                <option value="Java">Java Full Stack</option>
                <option value="Cloud">Cloud &amp; DevOps</option>
                <option value="React">Frontend &amp; React</option>
                <option value="SQL">Database Engineering</option>
              </select>
            </div>
          </div>

          {/* Quick Clickable Source Filter Pills */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Filter by Source:
            </span>

            <button
              type="button"
              onClick={() => handleSelectSource("All Sources")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedSource === "All Sources"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              <span>🌐 All Sources</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedSource === "All Sources" ? "bg-slate-800 text-slate-200" : "bg-white text-slate-600 border border-slate-200"}`}>
                {totalCatalogCount.toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectSource("LinkedIn")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedSource === "LinkedIn"
                  ? "bg-[#0A66C2] text-white shadow-xs shadow-[#0A66C2]/20 border border-[#0A66C2]"
                  : "bg-white hover:bg-blue-50 text-slate-700 border border-slate-200 hover:border-blue-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#0A66C2]" />
              <span>LinkedIn</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedSource === "LinkedIn" ? "bg-blue-800 text-white" : "bg-blue-50 text-[#0A66C2] border border-blue-100"}`}>
                5,580+
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectSource("Naukri")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedSource === "Naukri"
                  ? "bg-blue-800 text-white shadow-xs shadow-blue-800/20 border border-blue-800"
                  : "bg-white hover:bg-blue-50 text-slate-700 border border-slate-200 hover:border-blue-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-700" />
              <span>Naukri</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedSource === "Naukri" ? "bg-blue-900 text-white" : "bg-blue-50 text-blue-800 border border-blue-100"}`}>
                3,000+
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectSource("Indeed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedSource === "Indeed"
                  ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/20 border border-indigo-600"
                  : "bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200 hover:border-indigo-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>Indeed</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedSource === "Indeed" ? "bg-indigo-800 text-white" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}`}>
                3,700+
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. JOB LISTINGS GRID                                      */}
        {/* ========================================================= */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Verified Job Openings
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Showing verified opportunities {selectedSource !== "All Sources" ? `from ${selectedSource}` : "across top platforms"} matching your academic and skill criteria
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Page {page} of {totalPages}
            </span>
          </div>

          {/* Daily Limit Reached Lock Banner */}
          {isDailyLimitReached && (
            <div className="mb-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-rose-300 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900">
                      🔒 Verified Job Openings Locked for Today
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                      {todayAppliedCount} / {dailyApplyLimit} Used Today
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    You have reached your daily candidate application limit of <strong>{dailyApplyLimit} jobs per day</strong>. Further job applications are locked until 00:00 midnight. To increase your daily limit, please contact your administrator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isLoadingJobs ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-600">Loading Job Postings...</div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
              <Briefcase className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No Postings Match Your Search</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try broadening your keyword query or resetting the source, city, and category filters above.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSource("All Sources");
                  setSelectedCity("All India");
                  setSelectedCategory("All Categories");
                  fetchJobs(1, "All Sources");
                }}
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {jobs.map((job) => {
                const isApplied = appliedJobIds.includes(job.job_id);
                const srcInfo = getSourceBadge(job.source);
                const cleanSkills = extractCleanSkills(job);
                const displayLocation = formatJobLocation(job);
                const displayDegree = formatJobDegree(job.degree_required);
                const displayExp = formatJobExperience(job);

                return (
                  <div
                    key={job.job_id}
                    className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 hover:border-indigo-300 group"
                  >
                    <div>
                      {/* Top Row: Sourcing Channel & Applied Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] border flex items-center gap-1.5 ${srcInfo.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${srcInfo.dotColor}`} />
                          <span>{srcInfo.label}</span>
                        </span>
                        {isApplied ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            <span>Applied</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {job.job_type || "Full-time"}
                          </span>
                        )}
                      </div>

                      {/* Job Title */}
                      <h3
                        onClick={() => handleViewJobDetails(job)}
                        className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 cursor-pointer"
                        title={job.title}
                      >
                        {job.title}
                      </h3>

                      {/* Company Name */}
                      <div className="text-xs font-bold text-indigo-600 mt-0.5 line-clamp-1" title={job.company}>
                        {job.company || "Enterprise Employer"}
                      </div>

                      {/* Location, Experience & Degree Meta Grid */}
                      <div className="space-y-1.5 text-[11px] text-slate-600 mt-2.5 font-medium">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 truncate" title={displayLocation}>
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{displayLocation}</span>
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0 text-slate-500 font-semibold" title={displayExp}>
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{displayExp}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 truncate text-slate-500" title={job.degree_required || "Tech Graduate"}>
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{displayDegree}</span>
                        </div>
                      </div>

                      {/* Skills Tags */}
                      <div className="mt-3 flex flex-wrap gap-1 min-h-[22px]">
                        {cleanSkills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Card Footer: Posting Freshness & Actively Hiring Badge */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{job.posted_ago || "Recently Added"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Actively Hiring</span>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: View Details & Apply Now */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewJobDetails(job)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleApplyToJob(job, e)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          isApplied
                            ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : isDailyLimitReached
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25"
                        }`}
                        title={
                          isApplied
                            ? "Applied! Click to re-open official listing"
                            : isDailyLimitReached
                            ? `Daily quota reached (${dailyApplyLimit}/${dailyApplyLimit} applied today). Locked until tomorrow.`
                            : `Apply on ${job.source || "official portal"}`
                        }
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Applied</span>
                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                          </>
                        ) : isDailyLimitReached ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                            <span>Locked</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Apply Now</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <button
                type="button"
                disabled={page <= 1 || isLoadingJobs}
                onClick={() => fetchJobs(page - 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-xs font-bold text-slate-600">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || isLoadingJobs}
                onClick={() => fetchJobs(page + 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================= */}
      {/* 6. VIEW JOB DETAILS MODAL                                 */}
      {/* ========================================================= */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] border inline-flex items-center gap-1.5 ${getSourceBadge(selectedJob.source).className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getSourceBadge(selectedJob.source).dotColor}`} />
                  <span>{getSourceBadge(selectedJob.source).label}</span>
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-2">
                  {selectedJob.title}
                </h2>
                <div className="text-xs font-bold text-indigo-600 mt-0.5">
                  {selectedJob.company} • {formatJobLocation(selectedJob)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Complete Job Details */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Highlight Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Required Qualification
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block truncate">
                    {formatJobDegree(selectedJob.degree_required)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Experience Range
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {formatJobExperience(selectedJob)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Posting Status
                  </span>
                  <span className="font-bold text-emerald-700 mt-0.5 block flex items-center gap-1.5 text-xs truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="truncate">Actively Hiring • {selectedJob.posted_ago || "Recent"}</span>
                  </span>
                </div>
              </div>

              {/* Skills Requirement */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Required Competencies &amp; Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {extractCleanSkills(selectedJob).map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Full Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Complete Job Description
                </h4>
                {isLoadingDesc ? (
                  <div className="py-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading description from database...</span>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap font-sans text-xs">
                    {jobDescription}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="text-[11px] text-slate-500">
                Verified candidate application gateway
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const j = selectedJob;
                    handleApplyToJob(j);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    appliedJobIds.includes(selectedJob.job_id)
                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : isDailyLimitReached
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30"
                  }`}
                  title={
                    appliedJobIds.includes(selectedJob.job_id)
                      ? "Applied! Click to re-open official listing"
                      : isDailyLimitReached
                      ? `Daily quota reached (${dailyApplyLimit}/${dailyApplyLimit} applied today). Locked until tomorrow.`
                      : `Apply on ${selectedJob.source || "official portal"}`
                  }
                >
                  {appliedJobIds.includes(selectedJob.job_id) ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Applied (Re-open Link)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    </>
                  ) : isDailyLimitReached ? (
                    <>
                      <Lock className="w-4 h-4 text-rose-600" />
                      <span>Locked (Daily Quota {todayAppliedCount}/{dailyApplyLimit} Reached)</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      <span>Apply on Original Site ({selectedJob.source || "Official Portal"})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. APPLY FOR JOB CONFIRMATION MODAL                       */}
      {/* ========================================================= */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Submit Candidate Application
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {applyingJob.title}
                </h3>
                <div className="text-xs font-bold text-slate-500">
                  {applyingJob.company} • {formatJobLocation(applyingJob)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApplyingJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Details Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>
                <strong className="text-slate-900 font-bold">Applying As:</strong> {user?.full_name} ({user?.email})
              </div>
              <div>
                <strong className="text-slate-900 font-bold">Qualification:</strong> {user?.qualification}
              </div>
            </div>

            {/* Feedback Alerts */}
            {appFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  appFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {appFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{appFeedback.message}</span>
              </div>
            )}

            {/* Optional Application Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Candidate Note / Portfolio Link (Optional)
              </label>
              <textarea
                rows={3}
                value={applicationNotes}
                onChange={(e) => setApplicationNotes(e.target.value)}
                placeholder="Briefly state your relevant project experience or GitHub/portfolio link..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-medium text-slate-900 outline-hidden transition-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSubmittingApp}
                onClick={() => setApplyingJob(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingApp}
                onClick={handleSubmitApplication}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmittingApp ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Opening Original Site...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Open Original Job</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. MY APPLICATIONS HISTORY MODAL                          */}
      {/* ========================================================= */}
      {showMyApplications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    My Job Applications History
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tracking records for all applications submitted through your account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMyApplications(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-5 overflow-y-auto space-y-3">
              {isLoadingApps ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-xs font-bold">Loading application records...</span>
                </div>
              ) : applicationsList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">No Applications Submitted Yet</div>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Browse the verified openings on the dashboard and click Apply Now to record your applications.
                  </p>
                </div>
              ) : (
                applicationsList.map((app) => (
                  <div
                    key={app.application_id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Job Application #{app.application_id.slice(-6)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Job Identifier: <span className="font-mono text-indigo-700 font-semibold">{app.job_id}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Applied On: {new Date(app.application_date).toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>{app.application_status}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
              <button
                type="button"
                onClick={() => setShowMyApplications(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
