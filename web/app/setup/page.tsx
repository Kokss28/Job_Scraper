import Link from "next/link";
import {
  Settings,
  Database,
  Key,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Server,
  Cloud,
} from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { getJobsCatalog } from "@/lib/data-service";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function SetupPage() {
  let userEmail: string | null = null;
  let userRole = "recruiter";
  const { isCloudSupabase, jobs } = await getJobsCatalog();

  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userEmail = user.email || null;
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (roleRow?.role) userRole = roleRow.role;
      }
    } catch (e) {
      // offline fallback
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F1F5F9] text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <AppNav
        userEmail={userEmail}
        role={userRole}
        isCloudSupabase={isCloudSupabase}
      />
      <main className="flex-1 min-w-0 flex flex-col p-6 md:p-8 space-y-8 max-w-7xl mx-auto h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
              <Settings className="w-3.5 h-3.5" />
              Application &amp; Ingestion Environment
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              System Settings &amp; Cloud Integration
            </h1>
            <p className="text-slate-600 text-xs md:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
              Configure Supabase Cloud sync, scraper execution policies, and database replication status across Indian tech talent catalogs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                isCloudSupabase
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
              }`}
            >
              {isCloudSupabase ? "Supabase Cloud: Connected" : "Local SQLite Mode"}
            </span>
          </div>
        </div>

        {/* 3 Main Settings Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Cloud Database Integration Card */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                Database &amp; Supabase Cloud
              </h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {isCloudSupabase ? "Cloud Sync Active" : "Local Fallback Ready"}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 font-medium leading-relaxed">
                TalentPulse seamlessly toggles between <strong>Supabase Cloud PostgreSQL</strong> (with Row-Level Security) and local SQLite fallback storage.
              </p>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Current Catalog Volume</span>
                  <span className="text-indigo-600 font-black text-sm">{jobs.length.toLocaleString()} Open Roles</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span>Storage Engine</span>
                  <span className="font-semibold text-slate-700">{isCloudSupabase ? "Supabase Cloud (PostgreSQL)" : "SQLite Local Replica"}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span>Target Region</span>
                  <span className="font-semibold text-slate-700">India (Pan-National)</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Supabase Environment Keys
                </h3>
                <div className="font-mono text-[11px] bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 text-slate-700 font-semibold">
                  <div className="flex items-center justify-between">
                    <span>NEXT_PUBLIC_SUPABASE_URL</span>
                    <span className="text-emerald-700 font-bold">{hasEnvVars ? "CONFIGURED ✓" : "MISSING"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                    <span className="text-emerald-700 font-bold">{hasEnvVars ? "CONFIGURED ✓" : "MISSING"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Crawler & Ingestion Pipeline Preferences */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                Ingestion Engine Policies
              </h2>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                JobSpy + Direct API
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900">Full Description &amp; Degree Extraction</h4>
                  <p className="text-slate-500 font-medium mt-0.5">
                    Automatically retrieves full HTML job descriptions, parsed degree prerequisites (B.Tech, M.Tech, MCA, etc.), and experience bounds.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900">Automatic Catalog Deduplication</h4>
                  <p className="text-slate-500 font-medium mt-0.5">
                    Computes SHA-256 fingerprint hashes on (title + company + location) to eliminate duplicate postings across sources.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900">Live Scraper Studio Ingestion</h4>
                  <p className="text-slate-500 font-medium mt-0.5">
                    Immediate on-demand crawler dispatch across LinkedIn, Naukri, and Indeed directly from the Live Extraction Studio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Ready to explore live postings or trigger a crawler run?
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Jump directly to the Overview Dashboard or start a real-time extraction cycle.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/scraper"
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Live Scraper Studio
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <span>Overview Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
