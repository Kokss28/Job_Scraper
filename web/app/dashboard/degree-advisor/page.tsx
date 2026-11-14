"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  GraduationCap,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Code2,
  MapPin,
  TrendingUp,
  Sparkles,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  Layers,
  ArrowUpRight,
  FolderGit2,
  Loader2,
  X,
  Database,
  Cpu,
  ShieldCheck,
  Server,
  BarChart3,
  Info,
  Lightbulb,
} from "lucide-react";
import { DegreeReportData } from "@/lib/degree-matching";
import { generateDirectDegreePdf } from "@/lib/degree-pdf-generator";

export default function DegreeAdvisorPage() {
  const [selectedDegree, setSelectedDegree] = useState("bsc");
  const [selectedExp, setSelectedExp] = useState("fresher");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(10); // November (0-indexed: 10 = Nov)
  const calendarRef = useRef<HTMLDivElement>(null);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState("da");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DegreeReportData | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset pagination to page 1 whenever degree, exp, dates, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDegree, selectedExp, selectedDates, searchTerm, selectedSkillFilter, selectedCategoryFilter]);

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch report data whenever degree, experience or extraction date changes
  useEffect(() => {
    let isMounted = true;
    async function fetchReport() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          degree: selectedDegree,
          experience: selectedExp,
        });
        if (selectedDates.length > 0) {
          queryParams.set("dates", selectedDates.join(","));
        }
        const res = await fetch(`/api/degree-report?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to load degree intelligence report");
        const json = await res.json();
        if (isMounted) {
          setData(json.report);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Could not retrieve report data.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [selectedDegree, selectedExp, selectedDates]);

  // Map of available extraction dates to counts
  const availableDateMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.availableDates) {
      for (const item of data.availableDates) {
        map.set(item.date, item.count);
      }
    }
    return map;
  }, [data?.availableDates]);

  // Days in current month for the multi-date calendar
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const blanks = Array.from({ length: startDayOfWeek }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const count = availableDateMap.get(dateStr) || 0;
      return { dayNum, dateStr, count };
    });
    return [...blanks, ...days];
  }, [viewYear, viewMonth, availableDateMap]);

  const formattedDateRange = useMemo(() => {
    if (selectedDates.length === 0) return null;
    const sorted = [...selectedDates].sort();
    const startD = new Date(sorted[0] + "T00:00:00");
    const endD = new Date(sorted[sorted.length - 1] + "T00:00:00");
    if (sorted.length === 1 || sorted[0] === sorted[sorted.length - 1]) {
      return startD.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
    const startStr = startD.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const endStr = endD.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return `${startStr} – ${endStr}`;
  }, [selectedDates]);

  // Click 1 (start) then Click 13 (end) -> full range covered!
  const handleToggleDate = (dateStr: string) => {
    if (!rangeStart) {
      setRangeStart(dateStr);
      setSelectedDates([dateStr]);
    } else {
      const d1 = new Date(rangeStart + "T00:00:00");
      const d2 = new Date(dateStr + "T00:00:00");
      const minD = d1 <= d2 ? d1 : d2;
      const maxD = d1 <= d2 ? d2 : d1;

      const datesInRange: string[] = [];
      const curr = new Date(minD);
      while (curr <= maxD) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, "0");
        const d = String(curr.getDate()).padStart(2, "0");
        datesInRange.push(`${y}-${m}-${d}`);
        curr.setDate(curr.getDate() + 1);
      }
      setSelectedDates(datesInRange);
      setRangeStart(null);
      setHoverDate(null);
    }
    setSelectedSkillFilter(null);
    setSelectedCategoryFilter(null);
  };

  const handleSelectMonth = () => {
    const monthDates: string[] = [];
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (availableDateMap.has(dateStr)) {
        monthDates.push(dateStr);
      }
    }
    setSelectedDates((prev) => Array.from(new Set([...prev, ...monthDates])));
    setRangeStart(null);
    setHoverDate(null);
    setSelectedSkillFilter(null);
    setSelectedCategoryFilter(null);
  };

  const handleClearDates = () => {
    setSelectedDates([]);
    setRangeStart(null);
    setHoverDate(null);
    setSelectedSkillFilter(null);
    setSelectedCategoryFilter(null);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Active curriculum track
  const activeCurriculum = useMemo(() => {
    if (!data?.courseCurriculums) return null;
    return (
      data.courseCurriculums.find((c) => c.id === selectedCurriculumId) ||
      data.courseCurriculums[0]
    );
  }, [data?.courseCurriculums, selectedCurriculumId]);

  // Filter sample jobs by search term, clicked skill, and clicked category
  const filteredJobs = useMemo(() => {
    if (!data?.sampleJobs) return [];
    let jobs = data.sampleJobs;

    // Filter by clicked skill
    if (selectedSkillFilter) {
      const s = selectedSkillFilter.toLowerCase();
      const regex = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      jobs = jobs.filter((j) => {
        const text = `${j.skills.join(" ")} ${j.title}`.toLowerCase();
        return regex.test(text);
      });
    }

    // Filter by clicked category code (prioritize exact category_code tag)
    if (selectedCategoryFilter) {
      const code = selectedCategoryFilter.toUpperCase();
      jobs = jobs.filter((j) => {
        if (j.category_code) return j.category_code.toUpperCase() === code;
        const text = `${j.title} ${j.skills.join(" ")}`.toLowerCase();
        if (code === "DA") return /analyst|analytics|bi\b|power\s+bi|tableau/i.test(text);
        if (code === "DE") return /data\s+engineer|etl|pipeline|spark|warehouse/i.test(text);
        if (code === "AI") return /ai\b|machine\s+learning|data\s+scientist|ml\b|llm/i.test(text);
        if (code === "SE") return /developer|software|frontend|backend|fullstack|python/i.test(text);
        if (code === "QA") return /qa\b|test|tester|sdet|quality/i.test(text);
        if (code === "CLOUD") return /cloud|devops|aws|azure|linux|system/i.test(text);
        return true;
      });
    }

    // Filter by search bar
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.city.toLowerCase().includes(q) ||
          j.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    return jobs;
  }, [data?.sampleJobs, searchTerm, selectedSkillFilter, selectedCategoryFilter]);

  // Pagination calculation for verified matching jobs table (10 jobs per page)
  const totalPages = Math.ceil(filteredJobs.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedJobs = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredJobs.slice(start, start + PAGE_SIZE);
  }, [filteredJobs, safeCurrentPage, PAGE_SIZE]);

  // Dynamically switch In-Demand Skills based on selected category (e.g. choose DA -> show DA skills)
  // Strictly filter out any soft skills (Communication, Teamwork, etc.) to guarantee 100% technical skills
  const displayedSkills = useMemo(() => {
    const rawSkills =
      selectedCategoryFilter && data?.categorySkills?.[selectedCategoryFilter]?.length
        ? data.categorySkills[selectedCategoryFilter]
        : data?.topSkills || [];

    const SOFT_SKILLS = new Set([
      "communication",
      "interpersonal",
      "teamwork",
      "leadership",
      "problem solving",
      "presentation",
      "collaboration",
    ]);

    return rawSkills.filter((s) => !SOFT_SKILLS.has(s.name.toLowerCase()));
  }, [data?.categorySkills, data?.topSkills, selectedCategoryFilter]);

  // Click-to-Filter on Skill
  const handleToggleSkillFilter = (skillName: string) => {
    if (selectedSkillFilter === skillName) {
      setSelectedSkillFilter(null);
    } else {
      setSelectedSkillFilter(skillName);
    }
  };

  // Mapping from Job Category code to matching Course Curriculum ID
  const CATEGORY_TO_COURSE_ID: Record<string, string> = {
    DA: "da",
    AI: "ai_ml",
    SE: "se",
    CLOUD: "cloud",
    DE: "de",
    QA: "qa",
  };

  // Click-to-Filter on Category (Filters jobs table + automatically highlights best matching course)
  const handleToggleCategoryFilter = (code: string) => {
    if (selectedCategoryFilter === code) {
      setSelectedCategoryFilter(null);
    } else {
      setSelectedCategoryFilter(code);
      const targetCourseId = CATEGORY_TO_COURSE_ID[code.toUpperCase()];
      if (targetCourseId) {
        setSelectedCurriculumId(targetCourseId);
      }
    }
  };

  // DIRECT PDF DOWNLOAD (No printer dialog! Passes selectedCategoryFilter for dynamic Track 2 & filtered jobs)
  const handleDownloadPdf = () => {
    if (!data) return;
    setIsGeneratingPdf(true);
    try {
      generateDirectDegreePdf(data, selectedCategoryFilter);
    } catch (err) {
      console.error("PDF Generation error:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="w-full bg-[#F1F5F9] text-slate-900 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 select-none">
      {/* =========================================================================
          SCREEN HEADER & CONTROLS
      ========================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Academic Degree Career & Course Advisor
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Live Market Analytics
              </span>
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* DIRECT PDF DOWNLOAD BUTTON (No print dialog!) */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || !data}
            data-testid="btn-download-pdf"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            title="Download PDF directly to your computer"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Official PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE DEGREE SELECTOR & EXPERIENCE FILTER (Clean White Card)
      ========================================================================== */}
      <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Select Your Target Academic Degree:</span>
          </div>

          {/* Side of Degree Session: Calendar-Only Multi-Date Range Filter */}
          <div className="flex items-center gap-2 relative" ref={calendarRef}>
            {/* Live Count / Date Badge */}
            <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-50/80 text-indigo-700 border border-indigo-100 whitespace-nowrap shadow-xs">
              {rangeStart ? (
                <span>
                  📅 Start: <strong>{new Date(rangeStart + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</strong>. Click end date (e.g. 13)...
                </span>
              ) : selectedDates.length > 0 ? (
                <span>
                  📅 <strong>{formattedDateRange}</strong> ({selectedDates.length} {selectedDates.length === 1 ? "day" : "days"} • <strong>{data?.totalMarketJobs.toLocaleString() || 0}</strong> verified jobs)
                </span>
              ) : (
                <span>
                  Computed across <strong>{data?.totalMarketJobs.toLocaleString() || "11,461"}</strong> live verified postings
                </span>
              )}
            </div>

            {/* Calendar Icon Button (Click to toggle multi-date picker) */}
            <button
              type="button"
              onClick={() => setShowCalendar((prev) => !prev)}
              data-testid="calendar-filter-btn"
              className={`p-2 rounded-xl border transition-all cursor-pointer relative shadow-xs flex items-center justify-center ${
                selectedDates.length > 0 || rangeStart
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20 ring-2 ring-indigo-400/30"
                  : "bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 border-slate-200 hover:border-indigo-300"
              }`}
              title="Click to open calendar and select extraction date range (e.g. 1 to 13)"
              aria-label="Filter by extraction date"
            >
              <Calendar className="w-5 h-5" />
              {(selectedDates.length > 0 || rangeStart) && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-xs">
                  {selectedDates.length || 1}
                </span>
              )}
            </button>

            {(selectedDates.length > 0 || rangeStart) && (
              <button
                type="button"
                onClick={handleClearDates}
                className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset to all extraction dates"
              >
                <X className="w-3.5 h-3.5" />
                <span>All</span>
              </button>
            )}

            {/* Interactive Multi-Date Range Calendar Popover */}
            {showCalendar && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-76 sm:w-84 animate-in fade-in zoom-in-95 duration-150">
                {/* Month Navigation */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-sm font-bold text-slate-800">
                    {new Date(viewYear, viewMonth, 1).toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-400">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days Grid with Range Selection (Click 1 then Click 13 -> full covered) */}
                <div className="grid grid-cols-7 gap-1 text-center" onMouseLeave={() => setHoverDate(null)}>
                  {calendarDays.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`blank-${idx}`} className="h-8" />;
                    }
                    const isSelected = selectedDates.includes(cell.dateStr);
                    const isRangeStart = rangeStart === cell.dateStr;
                    const isInHoverRange = Boolean(
                      rangeStart &&
                      hoverDate &&
                      cell.dateStr >= (rangeStart <= hoverDate ? rangeStart : hoverDate) &&
                      cell.dateStr <= (rangeStart <= hoverDate ? hoverDate : rangeStart)
                    );
                    const hasJobs = cell.count > 0;
                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        onClick={() => handleToggleDate(cell.dateStr)}
                        onMouseEnter={() => {
                          if (rangeStart) setHoverDate(cell.dateStr);
                        }}
                        disabled={!hasJobs}
                        className={`h-8 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                          isRangeStart
                            ? "bg-indigo-600 text-white shadow-md font-bold scale-[1.08] ring-2 ring-indigo-400 ring-offset-1 z-10"
                            : isSelected
                            ? "bg-indigo-600 text-white shadow-xs font-bold"
                            : isInHoverRange
                            ? "bg-indigo-100 text-indigo-700 font-semibold"
                            : hasJobs
                            ? "text-slate-800 hover:bg-indigo-50 hover:text-indigo-600"
                            : "text-slate-300 cursor-not-allowed"
                        }`}
                        title={
                          hasJobs
                            ? `${cell.dateStr}: ${cell.count} jobs extracted`
                            : `${cell.dateStr}: No extractions`
                        }
                      >
                        <span>{cell.dayNum}</span>
                        {hasJobs && !isSelected && !isInHoverRange && !isRangeStart && (
                          <span className="w-1 h-1 bg-indigo-500 rounded-full mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Range Selection Helper Hint */}
                <div className="mt-2 text-[10.5px] text-center text-slate-500 font-medium">
                  {rangeStart ? (
                    <span className="text-indigo-600 font-semibold">
                      Click end date (e.g. 13) to cover full range
                    </span>
                  ) : selectedDates.length > 0 ? (
                    <span>
                      Selected range: <strong>{formattedDateRange}</strong>
                    </span>
                  ) : (
                    <span>Click start date, then click end date to cover range</span>
                  )}
                </div>

                {/* Popover Footer Controls */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectMonth}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                    >
                      Select Month
                    </button>
                    <button
                      type="button"
                      onClick={handleClearDates}
                      className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRangeStart(null);
                      setHoverDate(null);
                      setShowCalendar(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Properly Aligned Degree Cards (Symmetrical 3 Columns x 2 Rows) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { id: "bsc", title: "B.Sc.", subtitle: "Bachelor of Science (CS / IT)", icon: "🎓" },
            { id: "msc", title: "M.Sc.", subtitle: "Master of Science (CS / IT)", icon: "🔬" },
            { id: "bca", title: "BCA", subtitle: "Bachelor of Computer Applications", icon: "💻" },
            { id: "mca", title: "MCA", subtitle: "Master of Computer Applications", icon: "🚀" },
            { id: "btech", title: "B.E. / B.Tech", subtitle: "Engineering & Technology", icon: "⚙️" },
            { id: "all", title: "All Degrees", subtitle: "Any Graduate / Open Market", icon: "🌐" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedDegree(item.id);
                setSelectedSkillFilter(null);
                setSelectedCategoryFilter(null);
              }}
              data-testid={`degree-btn-${item.id}`}
              className={`flex items-center gap-3.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedDegree === item.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400/30"
                  : "bg-slate-50/90 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-xs ${
                  selectedDegree === item.id
                    ? "bg-white/20 text-white"
                    : "bg-white border border-slate-200/80"
                }`}
              >
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-bold truncate leading-tight ${
                    selectedDegree === item.id ? "text-white" : "text-slate-900"
                  }`}
                >
                  {item.title}
                </div>
                <div
                  className={`text-xs truncate mt-0.5 ${
                    selectedDegree === item.id ? "text-indigo-100" : "text-slate-500"
                  }`}
                >
                  {item.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Info callout explaining 'All Degrees / Open' */}
        {selectedDegree === "all" && (
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">What is \"All Degrees (Any Graduate / Open)\"?</strong>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                This filter aggregates all live job postings that do not enforce a strict degree prerequisite or explicitly state \"Any Graduate / Any Bachelor Degree Welcome\". It provides an unfiltered overview of all available entry points across India.
              </p>
            </div>
          </div>
        )}

        {/* Experience Sub-filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Experience Level:
            </span>
            {[
              { id: "fresher", label: "Freshers & Interns (0–1 yr)" },
              { id: "junior", label: "Junior (1–3 yrs)" },
              { id: "all", label: "All Experience" },
            ].map((exp) => (
              <button
                key={exp.id}
                onClick={() => {
                  setSelectedExp(exp.id);
                  setSelectedSkillFilter(null);
                }}
                data-testid={`exp-btn-${exp.id}`}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedExp === exp.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {exp.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Database Intelligence</span>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-xs"></div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* =========================================================================
          MAIN REPORT CONTENT
      ========================================================================== */}
      {!loading && data && (
        <div className="space-y-6">
          {/* Executive KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Eligible Jobs */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Eligible Openings
                </span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Briefcase className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900" data-testid="kpi-eligible-jobs">
                  {data.eligibleJobsCount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {data.eligibilityRate}% market
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Roles welcoming {data.degree.toUpperCase()}
              </p>
            </div>

            {/* Card 2: Fresher Friendly */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Fresher Friendly
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {data.fresherJobsCount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {data.fresherRate}% accessible
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Requiring 0 to 1 year experience
              </p>
            </div>

            {/* Card 3: Top Domain */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Top Hiring Sector
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-lg font-bold text-slate-900 truncate block">
                  {data.topCategories[0]?.category || "Data Analytics & BI"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Holds <strong className="text-indigo-600 font-bold">{data.topCategories[0]?.percentage || 0}%</strong> of all verified vacancies
              </p>
            </div>

            {/* Card 4: Most Critical Skill */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  #1 Core Skill
                </span>
                <span className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                  <Code2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-indigo-600">
                  {data.topSkills[0]?.name || "SQL"}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  in {data.topSkills[0]?.percentage || 0}% jobs
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Highest frequency prerequisite
              </p>
            </div>
          </div>

          {/* =========================================================================
              VISUAL VECTOR CHARTS SECTION (2-Column Grid)
          ========================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Category Distribution with DA, DE, AI, SE, QA Badges & Click-to-filter */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Job Categories for {data.degree.toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compare vacancy distribution across tech fields (Click category to filter table below)
                  </p>
                </div>
                {selectedCategoryFilter && (
                  <button
                    onClick={() => setSelectedCategoryFilter(null)}
                    className="text-xs font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <span>Clear [{selectedCategoryFilter}]</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Vector SVG Donut Graphic + Legend with DA, DE, AI, SE, QA Badges */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                {/* SVG Circular Donut Chart */}
                <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      let accumulatedPercent = 0;
                      return data.topCategories.map((cat) => {
                        const percent = cat.percentage;
                        const strokeDasharray = `${percent} ${100 - percent}`;
                        const strokeDashoffset = -accumulatedPercent;
                        accumulatedPercent += percent;
                        return (
                          <circle
                            key={cat.code}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke={cat.color}
                            strokeWidth="14"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-700"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-black text-slate-900">
                      {data.eligibleJobsCount}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Openings
                    </span>
                  </div>
                </div>

                {/* Legend & Breakdown with Clickable Category Chips */}
                <div className="flex-1 space-y-2 w-full">
                  {data.topCategories.map((cat) => {
                    const isSelected = selectedCategoryFilter === cat.code;
                    return (
                      <div
                        key={cat.code}
                        onClick={() => handleToggleCategoryFilter(cat.code)}
                        data-testid={`category-filter-${cat.code.toLowerCase()}`}
                        className={`flex items-center justify-between text-xs p-1.5 rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 border border-indigo-300 ring-2 ring-indigo-400/30"
                            : "hover:bg-slate-50 border border-transparent"
                        }`}
                        title={`Click to show only ${cat.category} jobs`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 shadow-xs"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-bold text-slate-800 truncate">
                            {cat.category}
                          </span>
                        </div>
                        <span className="font-mono text-slate-600 font-bold ml-2 flex-shrink-0">
                          {cat.count} jobs ({cat.percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Best Recommended Course Highlight Box - Shown ONLY when a category is selected */}
              {selectedCategoryFilter ? (
                (() => {
                  const activeCode = selectedCategoryFilter.toUpperCase();
                  const matchedCourseId = CATEGORY_TO_COURSE_ID[activeCode] || "da";
                  const matchedCourse = data.courseCurriculums.find((c) => c.id === matchedCourseId) || data.courseCurriculums[0];
                  const matchedCat = data.topCategories.find((c) => c.code.toUpperCase() === activeCode);

                  return (
                    <div className="mt-4 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col justify-between animate-in fade-in duration-200">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                          Best Course for {matchedCat?.category || "this domain"}:
                        </span>
                        <button
                          onClick={() => {
                            setSelectedCurriculumId(matchedCourseId);
                            const el = document.getElementById("curriculum-section");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>View Syllabus</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          {matchedCourse.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          {matchedCourse.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {matchedCourse.overview}
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {matchedCourse.modules.slice(0, 3).map((m) => (
                          <span
                            key={m.moduleName}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shadow-2xs"
                          >
                            {m.moduleName.split(":")[1]?.trim() || m.moduleName}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs text-slate-600 space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                      Domain Distribution Insight
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-600 whitespace-nowrap">Click to isolate</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-slate-600">
                    <strong className="text-slate-900">{data.topCategories[0]?.category}</strong> holds the largest share of openings ({data.topCategories[0]?.percentage}%), followed by <strong className="text-slate-900">{data.topCategories[1]?.category}</strong> ({data.topCategories[1]?.percentage}%). Click any domain above to filter matching vacancies and view its targeted curriculum.
                  </p>
                </div>
              )}

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Top Volume: <strong className="text-slate-800">{data.topCategories[0]?.category}</strong></span>
                <span className="text-indigo-600 font-semibold">100% verified</span>
              </div>
            </div>

            {/* Chart 2: Top Skills Ranking Bar Chart with CLICK-TO-FILTER */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    {selectedCategoryFilter ? (
                      <span>
                        Top Skills for{" "}
                        <span className="text-indigo-600">
                          {data.topCategories.find((c) => c.code.toUpperCase() === selectedCategoryFilter.toUpperCase())?.category || selectedCategoryFilter}
                        </span>
                      </span>
                    ) : (
                      "Top In-Demand Technical Skills"
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedCategoryFilter
                      ? `Dynamically filtered to show in-demand tech stacks for ${selectedCategoryFilter} roles`
                      : "Calculated across all live technical postings (Click any skill to filter)"}
                  </p>
                </div>
                {selectedSkillFilter && (
                  <button
                    onClick={() => setSelectedSkillFilter(null)}
                    data-testid="clear-skill-filter"
                    className="text-xs font-bold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg flex items-center gap-1 cursor-pointer border border-indigo-200"
                  >
                    <span>Filter: {selectedSkillFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Skills Progress Bars (Clickable) */}
              <div className="space-y-2 mt-2">
                {displayedSkills.slice(0, 7).map((skill, idx) => {
                  const isSkillActive = selectedSkillFilter === skill.name;
                  return (
                    <div
                      key={skill.name}
                      onClick={() => handleToggleSkillFilter(skill.name)}
                      data-testid={`skill-filter-${skill.name.toLowerCase()}`}
                      className={`space-y-1 p-1.5 rounded-xl transition-all cursor-pointer ${
                        isSkillActive
                          ? "bg-indigo-50/80 border border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                      title={`Click to filter jobs requiring ${skill.name}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-4 text-slate-400 font-mono text-[11px]">#{idx + 1}</span>
                          <span className="font-bold text-slate-800">{skill.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                              skill.tier === "core"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : skill.tier === "growth"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {skill.tier === "core" ? "Mandatory" : skill.tier === "growth" ? "Key Growth" : "Competitive Edge"}
                          </span>
                        </div>
                        <span className="font-mono text-slate-600 font-bold">
                          {skill.percentage}% frequency
                        </span>
                      </div>

                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500 to-emerald-500"
                          style={{ width: `${Math.max(8, skill.percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>💡 <strong>Soft Skills Note:</strong> Communication is a universal requirement</span>
                <span className="text-indigo-600 font-bold">Pure Tech Ranking</span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              TARGETED COURSE CURRICULUMS & DEEP TOPIC BREAKDOWN
              (Shown ONLY when a Job Category is clicked, per user request)
          ========================================================================== */}
          {selectedCategoryFilter ? (
            <div id="curriculum-section" className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <h3 className="text-lg font-black text-slate-900">
                      Targeted Course Curriculum for {(() => {
                        const matchedCat = data.topCategories.find((c) => c.code.toUpperCase() === selectedCategoryFilter.toUpperCase());
                        return matchedCat?.category || selectedCategoryFilter;
                      })()}
                    </h3>
                    <span className="whitespace-nowrap shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Track Curriculum
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Recommended learning syllabus & interview capstone project tailored for this specific career track
                  </p>
                </div>

                <button
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold whitespace-nowrap self-start sm:self-auto"
                  title="Close curriculum view"
                >
                  <X className="w-4 h-4" />
                  <span>Close Curriculum</span>
                </button>
              </div>

              {/* Active Curriculum Detail */}
              {activeCurriculum && (
                <div className="space-y-6">
                  {/* Market Reality & Career Guidance Callout */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">Domain Feasibility Insight:</strong> While <strong>Data Analytics</strong> and <strong>Software Development</strong> currently provide the largest volume of immediate entry-level fresher vacancies (~50%+) for general degree graduates, mastering <strong>Artificial Intelligence (GenAI)</strong>, <strong>Cloud Computing</strong>, and <strong>Data Engineering</strong> unlocks the highest salary ceilings and long-term career growth.
                    </p>
                  </div>
                  {/* Header Overview Card */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {activeCurriculum?.badge || "Track Focus"}
                        </span>
                        <span className="text-xs text-slate-500">
                          Demand: <strong className="text-slate-800 font-semibold">{activeCurriculum.marketDemand.split("•")[0]?.trim()}</strong>
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900 mt-1">
                        {activeCurriculum.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {activeCurriculum.overview}
                      </p>
                    </div>

                    <div className="text-left md:text-right text-xs text-slate-500 font-mono flex-shrink-0">
                      <p>Demand: <strong>{activeCurriculum.marketDemand}</strong></p>
                      <p>Prerequisites: <strong>{activeCurriculum.prerequisites}</strong></p>
                    </div>
                  </div>

                  {/* Detailed Module Topics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeCurriculum.modules.map((mod, idx) => (
                      <div
                        key={mod.moduleName}
                        className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-black flex items-center justify-center border border-indigo-200">
                            {idx + 1}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900">
                            {mod.moduleName}
                          </h5>
                        </div>

                        <ul className="space-y-1.5 pl-6 text-xs text-slate-600 list-disc">
                          {mod.topics.map((topic) => (
                            <li key={topic} className="leading-relaxed">
                              {topic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Capstone Portfolio Project Card */}
                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/70">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                      <FolderGit2 className="w-4 h-4 text-indigo-600" />
                      <span>Recommended Interview Capstone Project:</span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-900 mt-1">
                      {activeCurriculum.capstoneProject.title}
                    </h5>
                    <p className="text-xs text-slate-600 mt-1">
                      {activeCurriculum.capstoneProject.description}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {activeCurriculum.capstoneProject.tools.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200 shadow-2xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => {
                setSelectedCategoryFilter("DA");
                setSelectedCurriculumId("da");
              }}
              className="p-4 rounded-2xl bg-white border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs group"
            >
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center flex-shrink-0 border border-indigo-100">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Targeted Course Curriculums & Deep Topic Breakdown
                  </span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Click any Job Category above (e.g. Data Analytics, AI & ML, Cloud, Software Dev) to reveal its targeted course syllabus & capstone project.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-800 flex items-center gap-1 whitespace-nowrap">
                Click Category to Reveal →
              </span>
            </div>
          )}

          {/* =========================================================================
              CURATED LIVE JOBS TABLE (Searchable, Filterable by Skill & Direct Apply)
          ========================================================================== */}
          <div id="jobs-table-card" className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Verified Matching Jobs Available
                  </h3>
                  {selectedSkillFilter && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                      Skill: {selectedSkillFilter}
                      <button onClick={() => setSelectedSkillFilter(null)} className="cursor-pointer hover:text-indigo-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedCategoryFilter && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      Domain: {selectedCategoryFilter}
                      <button onClick={() => setSelectedCategoryFilter(null)} className="cursor-pointer hover:text-emerald-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filteredJobs.length === 0 ? (
                    <span>No matching live openings</span>
                  ) : (
                    <span>
                      Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, filteredJobs.length)} of{" "}
                      <strong>{filteredJobs.length}</strong> live openings welcoming {data.degree.toUpperCase()} candidates (Page {safeCurrentPage} of {totalPages})
                    </span>
                  )}
                </p>
              </div>

              {/* Table search filter */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by title, company, skill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold whitespace-nowrap">
                    <th className="py-3 px-4">Role Title</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Key Skills</th>
                    <th className="py-3 px-4 text-right">Apply Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No job postings found matching your active filter.
                        {(selectedSkillFilter || selectedCategoryFilter) && (
                          <div className="mt-2">
                            <button
                              onClick={() => {
                                setSelectedSkillFilter(null);
                                setSelectedCategoryFilter(null);
                              }}
                              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              Reset active filters
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedJobs.map((job) => (
                      <tr
                        key={job.job_id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                          {job.title}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[140px]">{job.company}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {job.city.toUpperCase() === "CT" || job.city.toUpperCase() === "CT, INDIA" ? "Pan-India (Flexible)" : job.city}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap min-w-[110px]">
                          <span className="inline-flex items-center whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {job.min_exp_years === 0 ? "Fresher (0y)" : `${job.min_exp_years}–${job.max_exp_years} yrs`}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {job.skills.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                onClick={() => handleToggleSkillFilter(s)}
                                className={`px-1.5 py-0.2 rounded text-[10px] border cursor-pointer transition-colors ${
                                  selectedSkillFilter === s
                                    ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                }`}
                                title={`Click to filter by ${s}`}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {job.link && job.link !== "#" ? (
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-[11px] font-semibold transition-all cursor-pointer"
                            >
                              <span>Apply</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Direct Portal</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (10 jobs per page) */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-3 border-t border-slate-100 text-xs text-slate-600">
                <div className="text-slate-500 font-medium">
                  Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1} to {Math.min(safeCurrentPage * PAGE_SIZE, filteredJobs.length)} of {filteredJobs.length} matching jobs
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Previous Page Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      document.getElementById("jobs-table-card")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    disabled={safeCurrentPage <= 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  {/* Page Number Buttons */}
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter((pageNum) => {
                      if (totalPages <= 7) return true;
                      if (pageNum === 1 || pageNum === totalPages) return true;
                      return Math.abs(pageNum - safeCurrentPage) <= 2;
                    })
                    .map((pageNum, idx, arr) => {
                      const prevPageNum = arr[idx - 1];
                      const hasGap = prevPageNum && pageNum - prevPageNum > 1;
                      const isActive = pageNum === safeCurrentPage;

                      return (
                        <React.Fragment key={pageNum}>
                          {hasGap && <span className="px-1 text-slate-400 select-none">...</span>}
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPage(pageNum);
                              document.getElementById("jobs-table-card")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isActive
                                ? "bg-indigo-600 text-white shadow-xs scale-105"
                                : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  {/* Next Page Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      document.getElementById("jobs-table-card")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    disabled={safeCurrentPage >= totalPages}
                    className="px-3 py-1.5 rounded-xl border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-500 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
