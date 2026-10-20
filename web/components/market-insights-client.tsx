"use client";

import { useMemo } from "react";
import {
  Building2,
  MapPin,
  GraduationCap,
  TrendingUp,
  Globe,
  Award,
  BookOpen,
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

const PLATFORM_COLORS: Record<string, string> = {
  LinkedIn: "#0a66c2",
  Naukri: "#2563eb",
  Indeed: "#003a9b",
};

export function MarketInsightsClient({
  jobs,
}: {
  jobs: UnifiedJobRecord[];
}) {
  const totalJobs = jobs.length;

  // Top 10 Indian Hubs
  const topHubs = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of jobs) {
      if (j.normalized_location && j.normalized_location !== "India (Not Specified)") {
        counts[j.normalized_location] = (counts[j.normalized_location] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hub, count]) => ({ hub: hub.split(",")[0], full: hub, count }));
  }, [jobs]);

  // Top 10 Companies
  const topCompanies = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of jobs) {
      if (j.company && j.company !== "Not Specified") {
        counts[j.company] = (counts[j.company] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([company, count]) => ({ company, count }));
  }, [jobs]);

  // Macro Education Cluster Metrics (4-Tier Hierarchy from Streamlit Dashboard)
  const eduClusterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      undergrad: 0,
      postgrad: 0,
      doctorate: 0,
      open: 0,
    };

    for (const j of jobs) {
      const cluster = j.edu_cluster || "";
      if (cluster.includes("Undergraduate")) counts.undergrad++;
      else if (cluster.includes("Postgraduate")) counts.postgrad++;
      else if (cluster.includes("Doctorate")) counts.doctorate++;
      else counts.open++;
    }
    return counts;
  }, [jobs]);

  // Sub-Cluster Track Distribution
  const eduTrackStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of jobs) {
      const sub = j.edu_subcluster || "Not Specified";
      counts[sub] = (counts[sub] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([track, count]) => ({
        track: track.split("(")[0].trim(),
        full: track,
        count,
      }));
  }, [jobs]);

  // Degree Requirements Pie
  const degreeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of jobs) {
      if (j.degree_required && j.degree_required !== "Not Specified") {
        counts[j.degree_required] = (counts[j.degree_required] || 0) + 1;
      }
    }
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([degree, count], idx) => ({
        degree,
        count,
        color: colors[idx % colors.length],
      }));
  }, [jobs]);

  // Platform Distribution
  const platformStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of jobs) {
      counts[j.source] = (counts[j.source] || 0) + 1;
    }
    return Object.entries(counts).map(([source, count]) => ({
      source,
      count,
      color: PLATFORM_COLORS[source] || "#64748b",
    }));
  }, [jobs]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-2">
          <Building2 className="w-3.5 h-3.5" />
          Indian Market Landscape
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Market &amp; Geographic Hiring Hubs
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Macro analytics across premier tech corridors, enterprise hiring organizations, and sourcing platform yield.
        </p>
      </div>

      {/* Row 1: Hubs & Employers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hubs Bar */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Top Indian IT Hubs Concentration
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Active job volume across major technology clusters
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topHubs} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                <XAxis
                  dataKey="hub"
                  stroke="#94a3b8"
                  fontSize={10}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={40}
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${val} postings`,
                    item.payload.full || item.payload.hub,
                  ]}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Companies */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                Premier Hiring Enterprises
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Organizations with the highest volume of open tech vacancies
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCompanies}
                layout="vertical"
                margin={{ left: 50, right: 20 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="company"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Macro Educational Clustering (4-Tier Hierarchy as in Streamlit) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-violet-400" />
            Educational Qualifications &amp; Cluster Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Macro clustering taxonomy: Undergraduate, Postgraduate, Doctorate, and Open entry tiers across India.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-indigo-500">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Undergraduate / Any Graduate
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {eduClusterCounts.undergrad.toLocaleString()}
            </div>
            <div className="text-xs text-indigo-400 font-semibold mt-0.5">
              {((eduClusterCounts.undergrad / (totalJobs || 1)) * 100).toFixed(1)}% of catalog
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-violet-500">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Postgraduate / Master&apos;s
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {eduClusterCounts.postgrad.toLocaleString()}
            </div>
            <div className="text-xs text-violet-400 font-semibold mt-0.5">
              {((eduClusterCounts.postgrad / (totalJobs || 1)) * 100).toFixed(1)}% of catalog
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-emerald-500">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Doctorate &amp; Research
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {eduClusterCounts.doctorate.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-400 font-semibold mt-0.5">
              {((eduClusterCounts.doctorate / (totalJobs || 1)) * 100).toFixed(1)}% of catalog
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-amber-500">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Open / No Degree Required
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {eduClusterCounts.open.toLocaleString()}
            </div>
            <div className="text-xs text-amber-400 font-semibold mt-0.5">
              {((eduClusterCounts.open / (totalJobs || 1)) * 100).toFixed(1)}% of catalog
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Degrees & Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Education Track Distribution */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-400" />
              Active Postings by Education Track
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Volume breakdown across tech engineering, general graduate, management, and diploma tracks
            </p>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={eduTrackStats}
                layout="vertical"
                margin={{ left: 40, right: 20 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="track"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Sourcing Share */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Platform Sourcing Yield
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Job distribution across LinkedIn, Naukri, and Indeed
            </p>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformStats}>
                <XAxis dataKey="source" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {platformStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Total Catalog Opportunities</span>
            <strong className="text-white">{jobs.length} Postings</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
