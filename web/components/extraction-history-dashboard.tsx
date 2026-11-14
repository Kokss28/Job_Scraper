"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Activity,
  X,
  FileSpreadsheet,
  Globe,
  Sparkles,
  MapPin,
  Check,
} from "lucide-react";

export type ExtractionRun = {
  id: string;
  date: string;
  startTime: string;
  completionTime: string;
  durationSeconds: number;
  durationFormatted: string;
  totalJobs: number;
  newJobs: number;
  totalDatabase: number;
  sources: string;
  domain: string;
  slot: string;
  keywords: string;
  location: string;
  status: "Completed" | "Failed" | "Running";
  yieldLinkedIn: number;
  yieldNaukri: number;
  yieldIndeed: number;
  batchCsvFile: string;
  batchCsvPath: string;
  errorNotes: string | null;
  fullTimestampIst: string;
};

type DaySummary = {
  totalRuns: number;
  totalExtracted: number;
  completedCount: number;
  failedCount: number;
  sourceYields: {
    LinkedIn: number;
    Naukri: number;
    Indeed: number;
  };
};

type Props = {
  initialCatalogCount?: number;
  initialActiveApis?: number;
};

export function ExtractionHistoryDashboard({
  initialCatalogCount = 11819,
  initialActiveApis = 3,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [runs, setRuns] = useState<ExtractionRun[]>([]);
  const [summary, setSummary] = useState<DaySummary>({
    totalRuns: 0,
    totalExtracted: 0,
    completedCount: 0,
    failedCount: 0,
    sourceYields: { LinkedIn: 0, Naukri: 0, Indeed: 0 },
  });
  const [catalogPostings, setCatalogPostings] = useState<number>(initialCatalogCount);
  const [activeSourcingApis, setActiveSourcingApis] = useState<number>(initialActiveApis);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [selectedRun, setSelectedRun] = useState<ExtractionRun | null>(null);

  // Calendar State & Handlers
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());

  // Sync calendar month/year with selectedDate
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setViewYear(parts[0]);
        setViewMonth(parts[1] - 1);
      }
    }
  }, [selectedDate]);

  // Click outside listener for calendar popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: ({
      dayNum: number;
      dateStr: string;
      hasExtractions: boolean;
      isToday: boolean;
      isFuture: boolean;
    } | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(viewMonth + 1).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      const dateStr = `${viewYear}-${monthStr}-${dayStr}`;

      const hasExtractions = availableDates.includes(dateStr);
      const isDateToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;

      cells.push({
        dayNum: day,
        dateStr,
        hasExtractions,
        isToday: isDateToday,
        isFuture,
      });
    }

    return cells;
  }, [viewYear, viewMonth, availableDates]);

  // Fetch extraction history data
  const fetchData = useCallback(
    async (dateToFetch?: string, isBackground = false) => {
      const targetDate = dateToFetch || selectedDate;
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const res = await fetch(`/api/extraction-history?date=${encodeURIComponent(targetDate)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load history");

        const data = await res.json();
        if (data.success) {
          setAvailableDates(data.dates || []);
          if (data.selectedDate && (!dateToFetch || data.selectedDate === targetDate)) {
            setSelectedDate(data.selectedDate);
          }
          setRuns(data.runs || []);
          setSummary(data.summary || {
            totalRuns: 0,
            totalExtracted: 0,
            completedCount: 0,
            failedCount: 0,
            sourceYields: { LinkedIn: 0, Naukri: 0, Indeed: 0 },
          });
          if (data.catalogPostings) setCatalogPostings(data.catalogPostings);
          if (data.activeSourcingApis) setActiveSourcingApis(data.activeSourcingApis);
          setLastRefreshedAt(
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          );
        }
      } catch (e) {
        console.warn("Could not refresh extraction history:", e);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedDate]
  );

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Daily automatic polling: polls every 8 seconds for live extraction monitoring without reload
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(selectedDate, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchData, selectedDate]);

  // Date Navigation handlers
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    fetchData(date);
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const formattedSelectedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. KEPT OPTIONS: Catalog Postings & Active Sourcing APIs */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Catalog Postings */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 border-t-4 border-t-emerald-600 shadow-xs">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Catalog Postings
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
            {catalogPostings.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            Unified job records
          </div>
        </div>

        {/* Card 2: Active Sourcing APIs */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 border-t-4 border-t-violet-600 shadow-xs">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Active Sourcing APIs
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
            {activeSourcingApis}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            LinkedIn, Naukri, Indeed
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. LIVE EXTRACTION MONITORING & HISTORY DASHBOARD        */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* Dashboard Header Bar */}
        <div className="p-5 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Live Extraction History &amp; Audit Ledger
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Real-time multi-source crawler monitoring, exact start/completion timestamps, and daily audit yields.
            </p>
          </div>

          {/* Live Pulse Indicator & Quick Refresh */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>Live Sync Active</span>
            </div>

            <button
              type="button"
              onClick={() => fetchData(selectedDate)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs disabled:opacity-60"
              title="Refresh extraction records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. DATE-WISE PICKER & CALENDAR CONTROLS                   */}
        {/* ========================================================= */}
        <div className="p-5 bg-slate-50/70 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Active Date Banner */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-2xs shrink-0">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Extraction Records For Date
                </div>
                <div className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>{formattedSelectedDate}</span>
                  {isToday && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Today
                    </span>
                  )}
                </div>
                {lastRefreshedAt && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Live auto-updated at: <span className="font-mono font-semibold">{lastRefreshedAt}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar Option Trigger & Dropdown */}
            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setShowCalendar((prev) => !prev)}
                data-testid="extraction-calendar-btn"
                className={`px-4 py-2.5 rounded-xl border transition-all font-bold text-xs flex items-center gap-2.5 shadow-2xs cursor-pointer ${
                  showCalendar
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/25 ring-2 ring-indigo-400/30"
                    : "bg-white text-slate-700 hover:text-indigo-600 border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
                }`}
                title="Select date on interactive calendar"
              >
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Choose Date:</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-mono font-bold">
                  {selectedDate}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {/* Interactive Calendar Popover */}
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
                      {new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
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

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((cell, idx) => {
                      if (!cell) {
                        return <div key={`blank-${idx}`} className="h-8" />;
                      }
                      const isSelected = cell.dateStr === selectedDate;
                      const hasExtractions = cell.hasExtractions;
                      const isFuture = cell.isFuture;

                      return (
                        <button
                          key={cell.dateStr}
                          type="button"
                          onClick={() => {
                            handleSelectDate(cell.dateStr);
                            setShowCalendar(false);
                          }}
                          className={`h-8 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-md font-bold scale-[1.05]"
                              : isFuture
                              ? "text-slate-400 hover:bg-slate-100"
                              : hasExtractions
                              ? "text-indigo-900 hover:bg-indigo-50 hover:text-indigo-700 font-bold bg-indigo-50/70 border border-indigo-200"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                          title={
                            hasExtractions
                              ? `${cell.dateStr}: Extractions recorded (Click to view)`
                              : cell.dateStr
                          }
                        >
                          <span>{cell.dayNum}</span>
                          {hasExtractions && !isSelected && (
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Popover Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const todayStr = new Date().toISOString().slice(0, 10);
                        handleSelectDate(todayStr);
                        setShowCalendar(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors cursor-pointer text-[11px]"
                    >
                      Today
                    </button>
                    <span className="text-[10px] text-slate-500 font-medium">
                      • Recorded extractions
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCalendar(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer text-[11px]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. DAY SUMMARY STATS CARDS                                */}
        {/* ========================================================= */}
        <div className="p-5 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border-b border-slate-200">
          {/* Day Total Runs */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Extractions
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {summary.totalRuns}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Recorded sessions</span>
          </div>

          {/* Day Total Jobs Harvested */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              Jobs Harvested
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              +{summary.totalExtracted.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">Added on this date</span>
          </div>

          {/* Source Breakdown on this date */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-center shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 block mb-1">
              Source Yields
            </span>
            <div className="flex items-center justify-center gap-2 text-xs font-bold flex-wrap">
              <span className="text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                In: {summary.sourceYields.LinkedIn}
              </span>
              <span className="text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                Na: {summary.sourceYields.Naukri}
              </span>
              <span className="text-violet-700 bg-violet-100/70 px-1.5 py-0.5 rounded">
                Id: {summary.sourceYields.Indeed}
              </span>
            </div>
          </div>

          {/* Execution Reliability */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Execution Health
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-emerald-700 font-bold text-sm bg-emerald-100 px-2 py-0.5 rounded-lg">
                {summary.completedCount} OK
              </span>
              {summary.failedCount > 0 && (
                <span className="text-rose-700 font-bold text-sm bg-rose-100 px-2 py-0.5 rounded-lg">
                  {summary.failedCount} Err
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-1">
              {summary.failedCount === 0 ? "100% Verified" : "Audit flagged"}
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. EXTRACTION LEDGER TABLE (CLICKABLE RECORDS)           */}
        {/* ========================================================= */}
        <div className="p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Extraction Ledger ({runs.length} Runs)
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Click any record row to inspect full telemetry &amp; file path
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
              <div className="text-xs font-bold">Loading extraction records...</div>
            </div>
          ) : runs.length === 0 ? (
            <div className="py-16 text-center p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 space-y-2">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                No Extractions Recorded on {formattedSelectedDate}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No scraping jobs were executed on this date. Use the date picker above to navigate to other recorded dates or trigger a new crawl from Live Extraction.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Timestamps (Start ➔ End)</th>
                      <th className="py-3 px-4">Sources</th>
                      <th className="py-3 px-4">Domain &amp; Query</th>
                      <th className="py-3 px-4 text-center">Harvested</th>
                      <th className="py-3 px-4">Platform Yield</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {runs.map((run) => (
                      <tr
                        key={run.id}
                        onClick={() => setSelectedRun(run)}
                        className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                      >
                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              run.status === "Completed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : run.status === "Running"
                                ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {run.status === "Completed" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {run.status === "Running" && <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />}
                            {run.status === "Failed" && <AlertCircle className="w-3 h-3 text-rose-600" />}
                            {run.status}
                          </span>
                        </td>

                        {/* Timestamps */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{run.startTime}</span>
                            <span className="text-slate-400">➔</span>
                            <span>{run.completionTime}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Duration: <span className="font-semibold text-slate-700">{run.durationFormatted}</span>
                          </div>
                        </td>

                        {/* Platform / Sources */}
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            run.sources.includes("Linkedin") || run.sources.includes("LinkedIn")
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : run.sources.includes("Naukri")
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }`}>
                            {run.sources}
                          </span>
                        </td>

                        {/* Domain & Keywords */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 truncate max-w-[200px]">
                            {run.domain}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                            "{run.keywords}" in {run.location}
                          </div>
                        </td>

                        {/* Total Harvested */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-black text-sm px-2 py-0.5 rounded ${
                            run.totalJobs > 0 ? "text-emerald-700 bg-emerald-50" : "text-slate-500"
                          }`}>
                            +{run.totalJobs}
                          </span>
                        </td>

                        {/* Platform Yield Breakdown */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-[10px] font-bold flex-wrap">
                            {run.yieldLinkedIn > 0 && (
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                                LI: {run.yieldLinkedIn}
                              </span>
                            )}
                            {run.yieldNaukri > 0 && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded">
                                NA: {run.yieldNaukri}
                              </span>
                            )}
                            {run.yieldIndeed > 0 && (
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded">
                                ID: {run.yieldIndeed}
                              </span>
                            )}
                            {run.yieldLinkedIn === 0 && run.yieldNaukri === 0 && run.yieldIndeed === 0 && (
                              <span className="text-slate-400 font-medium">0 Yield</span>
                            )}
                          </div>
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRun(run);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-[11px] transition-colors"
                          >
                            Inspect ➔
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. CLICKABLE EXTRACTION DETAILS MODAL / DRAWER            */}
      {/* ========================================================= */}
      {selectedRun && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedRun(null)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                    selectedRun.status === "Completed"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : selectedRun.status === "Running"
                      ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {selectedRun.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {selectedRun.status === "Running" && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                  {selectedRun.status === "Failed" && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                  {selectedRun.status}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Extraction Run Telemetry
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              {/* Timing Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                    Extraction Start Time
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block font-mono">
                    {selectedRun.startTime}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                    Extraction End Time
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block font-mono">
                    {selectedRun.completionTime}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-slate-600">
                  <span>Execution Duration:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono">
                    {selectedRun.durationFormatted} ({selectedRun.durationSeconds}s)
                  </span>
                </div>
              </div>

              {/* Scope & Parameters */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                  Crawl Scope &amp; Target Query
                </span>
                <div className="p-3.5 rounded-xl border border-slate-200 space-y-2 bg-white shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Domain Category:</span>
                    <span className="font-bold text-slate-900">{selectedRun.domain} ({selectedRun.slot})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Search Keywords:</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      "{selectedRun.keywords}"
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Target Location:</span>
                    <span className="font-semibold text-slate-800">{selectedRun.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Target Platforms:</span>
                    <span className="font-bold text-indigo-700">{selectedRun.sources}</span>
                  </div>
                </div>
              </div>

              {/* Yield Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                  Jobs Harvested &amp; Yield Per Portal
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-center">
                    <span className="text-[10px] text-blue-800 font-bold uppercase block">LinkedIn</span>
                    <span className="text-lg font-black text-blue-700 mt-0.5 block">
                      {selectedRun.yieldLinkedIn}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase block">Naukri</span>
                    <span className="text-lg font-black text-emerald-700 mt-0.5 block">
                      {selectedRun.yieldNaukri}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 text-center">
                    <span className="text-[10px] text-indigo-800 font-bold uppercase block">Indeed</span>
                    <span className="text-lg font-black text-indigo-700 mt-0.5 block">
                      {selectedRun.yieldIndeed}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Total Added this Session:</span>
                  <span className="font-black text-emerald-700 text-sm">+{selectedRun.totalJobs} jobs</span>
                </div>
              </div>

              {/* Output File & Error notes */}
              {selectedRun.batchCsvFile && (
                <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-1">
                  <span className="text-[10px] text-indigo-900 font-bold uppercase tracking-wider block">
                    Saved Batch CSV File
                  </span>
                  <div className="font-mono text-[11px] text-indigo-950 font-bold truncate">
                    {selectedRun.batchCsvFile}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {selectedRun.batchCsvPath}
                  </div>
                </div>
              )}

              {selectedRun.errorNotes && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1 text-rose-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-800">
                    Execution Error Log
                  </span>
                  <div className="font-mono text-[11px] font-semibold">
                    {selectedRun.errorNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

