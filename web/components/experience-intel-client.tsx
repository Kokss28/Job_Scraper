"use client";

import { useState, useMemo } from "react";
import {
  Compass,
  Briefcase,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { UnifiedJobRecord } from "@/lib/taxonomy";

const TIER_COLORS: Record<string, string> = {
  "Fresher & Entry (0 - 2 Yrs)": "#10b981",
  "Mid-Level (2 - 5 Yrs)": "#6366f1",
  "Senior (5 - 8 Yrs)": "#8b5cf6",
  "Staff & Lead (8+ Yrs)": "#f59e0b",
  "Not Specified": "#64748b",
};

export function ExperienceIntelClient({
  jobs,
}: {
  jobs: UnifiedJobRecord[];
}) {
  const [selectedTier, setSelectedTier] = useState<string>("All Tiers");

  // Career Tier distribution
  const tierStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of jobs) {
      counts[j.career_tier] = (counts[j.career_tier] || 0) + 1;
    }
    return counts;
  }, [jobs]);

  const total = jobs.length;
  const fresherCount = tierStats["Fresher & Entry (0 - 2 Yrs)"] || 0;
  const midCount = tierStats["Mid-Level (2 - 5 Yrs)"] || 0;
  const seniorCount = tierStats["Senior (5 - 8 Yrs)"] || 0;
  const leadCount = tierStats["Staff & Lead (8+ Yrs)"] || 0;

  // Statistical calculations (Mean, Median, Mode)
  const { meanExp, medianExp, modeExp } = useMemo(() => {
    const valid = jobs
      .map((j) => j.min_exp_num)
      .filter((n): n is number => n !== null && !isNaN(n))
      .sort((a, b) => a - b);

    if (!valid.length) return { meanExp: "0.0", medianExp: "0.0", modeExp: "0.0" };

    const sum = valid.reduce((a, b) => a + b, 0);
    const mean = (sum / valid.length).toFixed(1);

    const mid = Math.floor(valid.length / 2);
    const median =
      valid.length % 2 !== 0
        ? valid[mid].toFixed(1)
        : ((valid[mid - 1] + valid[mid]) / 2).toFixed(1);

    const freq: Record<number, number> = {};
    let maxFreq = 0;
    let modeVal = valid[0];
    for (const val of valid) {
      freq[val] = (freq[val] || 0) + 1;
      if (freq[val] > maxFreq) {
        maxFreq = freq[val];
        modeVal = val;
      }
    }

    return { meanExp: mean, medianExp: median, modeExp: modeVal.toFixed(1) };
  }, [jobs]);

  // Histogram data for numeric experience 0 to 15
  const expHistogramData = useMemo(() => {
    const buckets: Record<number, number> = {};
    for (let i = 0; i <= 15; i++) buckets[i] = 0;

    for (const j of jobs) {
      if (j.min_exp_num !== null) {
        const rounded = Math.min(15, Math.floor(j.min_exp_num));
        buckets[rounded] = (buckets[rounded] || 0) + 1;
      }
    }

    return Object.entries(buckets).map(([years, count]) => {
      const yrNum = parseInt(years, 10);
      let tierColor = "#64748b";
      if (yrNum <= 2) tierColor = "#10b981";
      else if (yrNum <= 5) tierColor = "#6366f1";
      else if (yrNum <= 8) tierColor = "#8b5cf6";
      else tierColor = "#f59e0b";

      return {
        years: `${years}y`,
        count,
        color: tierColor,
      };
    });
  }, [jobs]);

  // Pie chart data
  const pieData = useMemo(() => {
    return Object.entries(tierStats).map(([name, value]) => ({
      name,
      value,
      color: TIER_COLORS[name] || "#64748b",
    }));
  }, [tierStats]);

  // Skills demand for the selected tier
  const tierSkills = useMemo(() => {
    const subset =
      selectedTier === "All Tiers"
        ? jobs
        : jobs.filter((j) => j.career_tier === selectedTier);

    const counts: Record<string, number> = {};
    for (const j of subset) {
      if (!j.skills || j.skills === "Not Specified") continue;
      const tokens = j.skills.split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
      for (const t of tokens) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, demand]) => ({ skill, demand }));
  }, [jobs, selectedTier]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <Compass className="w-3.5 h-3.5" />
            Talent Experience Matrix
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Experience &amp; Career Tier Intelligence
          </h1>
          <p className="text-slate-600 text-xs md:text-sm mt-1 font-medium max-w-2xl">
            Quantitative analysis of Indian IT talent bands, career tier distribution, and seniority-to-skill expectations.
          </p>
        </div>

        {/* Statistical Summary Badge */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-xs rounded-xl px-4 py-2.5 text-xs text-slate-600 font-semibold self-start md:self-auto">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            Mean: <strong className="text-slate-900 font-bold">{meanExp}y</strong>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            Median: <strong className="text-slate-900 font-bold">{medianExp}y</strong>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            Peak: <strong className="text-slate-900 font-bold">{modeExp}y</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-5 border-t-4 border-t-emerald-600 shadow-xs">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Fresher &amp; Entry (0 - 2y)
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
            {fresherCount.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-600 font-bold mt-0.5">
            {((fresherCount / total) * 100).toFixed(1)}% of talent demand
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 border-t-4 border-t-indigo-600 shadow-xs">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Mid-Level (2 - 5y)
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
            {midCount.toLocaleString()}
          </div>
          <div className="text-xs text-indigo-600 font-bold mt-0.5">
            {((midCount / total) * 100).toFixed(1)}% of talent demand
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 border-t-4 border-t-violet-600 shadow-xs">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Senior (5 - 8y)
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
            {seniorCount.toLocaleString()}
          </div>
          <div className="text-xs text-violet-600 font-bold mt-0.5">
            {((seniorCount / total) * 100).toFixed(1)}% of talent demand
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 border-t-4 border-t-amber-500 shadow-xs">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Staff &amp; Lead (8+y)
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
            {leadCount.toLocaleString()}
          </div>
          <div className="text-xs text-amber-600 font-bold mt-0.5">
            {((leadCount / total) * 100).toFixed(1)}% of talent demand
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Experience Curve */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Experience Distribution Curve (0 to 15+ Years)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Distribution of minimum required experience across open roles
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-slate-600 font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 0-2y
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> 2-5y
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> 5-8y
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 8+y
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expHistogramData}>
                <XAxis dataKey="years" stroke="#94a3b8" fontSize={11} tick={{ fill: "#475569", fontWeight: 600 }} />
                <YAxis stroke="#94a3b8" fontSize={11} tick={{ fill: "#475569", fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "12px",
                    color: "#0f172a",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    fontWeight: 600,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {expHistogramData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Share Pie */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-600" />
              Career Tier Market Share
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Proportion of vacancies per seniority level
            </p>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "12px",
                    color: "#0f172a",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    fontWeight: 600,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
            {pieData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-slate-700 font-medium"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
                <strong className="text-slate-900 font-bold">{item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skills Demanded by Career Tier */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Required Skills by Career Tier
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Select a tier below to see what technologies and tools are specifically demanded at that stage.
            </p>
          </div>

          {/* Tier Switcher Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              "All Tiers",
              "Fresher & Entry (0 - 2 Yrs)",
              "Mid-Level (2 - 5 Yrs)",
              "Senior (5 - 8 Yrs)",
              "Staff & Lead (8+ Yrs)",
            ].map((tier) => {
              const active = selectedTier === tier;
              return (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  {tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* Skills Horizontal Bar Chart */}
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tierSkills}
              layout="vertical"
              margin={{ left: 40, right: 20 }}
            >
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tick={{ fill: "#475569", fontWeight: 600 }} />
              <YAxis
                type="category"
                dataKey="skill"
                stroke="#94a3b8"
                fontSize={11}
                width={120}
                tick={{ fill: "#475569", fontWeight: 600 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                  borderRadius: "12px",
                  color: "#0f172a",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  fontWeight: 600,
                }}
              />
              <Bar dataKey="demand" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
