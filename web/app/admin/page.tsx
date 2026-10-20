import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  Users,
  BriefcaseBusiness,
  Building2,
  UserCheck,
  Terminal,
  Activity,
  Sparkles,
} from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { AdminUserControls } from "@/components/admin-user-controls";
import { QueueScrapeForm } from "@/components/queue-scrape-form";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { getJobsCatalog } from "@/lib/data-service";

type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
  is_active: boolean;
  user_roles: { role: string }[];
};

export default async function AdminPage() {
  const { jobs, isCloudSupabase } = await getJobsCatalog();

  // If Supabase is configured, use live auth and DB
  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) redirect("/auth/login");

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (roleRow?.role !== "admin") redirect("/dashboard");

      const [
        { data: users, count: usersCount },
        { count: jobsCount },
        { data: sources },
        { data: runs, error: runsError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,display_name,created_at,is_active,user_roles(role)", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("jobs").select("job_id", { count: "exact", head: true }),
        supabase.from("jobs").select("source"),
        supabase
          .from("scrape_runs")
          .select("id,source,status,max_age_hours,created_at,result_summary,error_message")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const profiles = (users ?? []) as unknown as Profile[];
      const sourceCounts = new Map<string, number>();
      for (const item of sources ?? []) {
        const key = item.source || "Other";
        sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
      }

      return renderAdminView({
        userEmail: auth.user.email || "admin",
        userId: auth.user.id,
        usersCount: usersCount ?? profiles.length,
        jobsCount: jobsCount ?? jobs.length,
        sourceCounts,
        profiles,
        runs: runs ?? [],
        isCloudSupabase: true,
      });
    } catch (e) {
      console.warn("Live admin query failed, falling back to local admin mode:", e);
    }
  }

  // Demo Admin Fallback Mode
  const demoProfiles: Profile[] = [
    {
      id: "usr_admin_01",
      display_name: "Lead System Admin",
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      is_active: true,
      user_roles: [{ role: "admin" }],
    },
    {
      id: "usr_recruiter_02",
      display_name: "Pravin Kumar (Lead Recruiter)",
      created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
      is_active: true,
      user_roles: [{ role: "recruiter" }],
    },
    {
      id: "usr_candidate_03",
      display_name: "Arun Sharma (Job Seeker)",
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      is_active: true,
      user_roles: [{ role: "user" }],
    },
  ];

  const sourceCounts = new Map<string, number>();
  for (const item of jobs) {
    const key = item.source || "Other";
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }

  return renderAdminView({
    userEmail: "admin@enterprise.local",
    userId: "demo_admin_id",
    usersCount: demoProfiles.length,
    jobsCount: jobs.length,
    sourceCounts,
    profiles: demoProfiles,
    runs: [
      {
        id: "run_sample_01",
        source: "LinkedIn, Naukri, Indeed",
        status: "completed",
        max_age_hours: 24,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        result_summary: "Harvested and enriched 42 fresh Indian tech opportunities",
        error_message: null,
      },
      {
        id: "run_sample_02",
        source: "LinkedIn",
        status: "completed",
        max_age_hours: 12,
        created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
        result_summary: "Synced 18 Bangalore/Hyderabad Python and AI openings",
        error_message: null,
      },
    ],
    isCloudSupabase: false,
  });
}

function renderAdminView({
  userEmail,
  userId,
  usersCount,
  jobsCount,
  sourceCounts,
  profiles,
  runs,
  isCloudSupabase,
}: {
  userEmail: string;
  userId: string;
  usersCount: number;
  jobsCount: number;
  sourceCounts: Map<string, number>;
  profiles: Profile[];
  runs: any[];
  isCloudSupabase: boolean;
}) {
  return (
    <div className="flex min-h-screen bg-[#070b14] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <AppNav
        userEmail={userEmail}
        role="admin"
        isCloudSupabase={isCloudSupabase}
      />
      <main className="flex-1 min-w-0 flex flex-col p-8 space-y-8 max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-8 shadow-2xl overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Role-Based Access Control &amp; System Administration
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Admin Governance Console
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Manage user access tiers (Admin, Recruiter, Candidate), dispatch multi-source scraping jobs, and oversee pan-India catalog consistency.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  isCloudSupabase
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                }`}
              >
                {isCloudSupabase ? "Supabase Cloud RLS" : "Local Demo Storage"}
              </span>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-indigo-500">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Accounts
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {usersCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">RBAC user profiles</div>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-emerald-500">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Catalog Postings
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {jobsCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Unified job records</div>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-violet-500">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Sourcing APIs
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {sourceCounts.size}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">LinkedIn, Naukri, Indeed</div>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 border-t-2 border-t-amber-500">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Accounts
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {profiles.filter((p) => p.is_active).length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Unrestricted access</div>
          </div>
        </div>

        {/* User Management & RBAC Roles Table */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                User Profiles &amp; RBAC Role Assignment
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign Candidate, Recruiter, or Administrator roles and enable/disable account access.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-lg">
              {profiles.length} Profiles
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 px-3">Profile Name &amp; ID</th>
                  <th className="pb-3 px-3">Created</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Role Tier &amp; Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">
                        {profile.display_name || "Enterprise User"}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {profile.id}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-400">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          profile.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            profile.is_active ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                        {profile.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <AdminUserControls
                        userId={profile.id}
                        role={profile.user_roles?.[0]?.role || "user"}
                        active={profile.is_active}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Ingestion Dispatcher Panel */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-violet-400" />
              Scraper Queue Dispatcher
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Queue immediate scraping jobs to be executed by the Python background worker.
            </p>
          </div>

          <QueueScrapeForm userId={userId} />

          {/* Recent Runs Table */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recent Ingestion Runs
            </h3>
            <div className="space-y-2">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {run.status}
                    </span>
                    <strong className="text-white">{run.source}</strong>
                    <span className="text-slate-400">Past {run.max_age_hours} hrs</span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-4">
                    <span className="text-slate-300">
                      {run.result_summary || "Awaiting execution"}
                    </span>
                    <time className="text-slate-500">
                      {new Date(run.created_at).toLocaleTimeString()}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
