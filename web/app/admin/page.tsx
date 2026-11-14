import { ShieldCheck } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { ExtractionHistoryDashboard } from "@/components/extraction-history-dashboard";
import { AdminCodeManager } from "@/components/admin-code-manager";
import { getJobsCatalog } from "@/lib/data-service";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { jobs, isCloudSupabase } = await getJobsCatalog();

  let jobsCount = jobs.length;
  let userEmail: string | undefined = undefined;

  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      const countRes = await supabase.from("jobs").select("job_id", { count: "exact", head: true });
      if (countRes.count) jobsCount = countRes.count;
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user?.email) userEmail = auth.user.email;
    } catch {
      // fallback to catalog count
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F1F5F9] text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <AppNav
        userEmail={userEmail}
        role="admin"
        isCloudSupabase={isCloudSupabase}
      />
      <main className="flex-1 min-w-0 flex flex-col p-6 md:p-8 space-y-6 max-w-7xl mx-auto h-screen overflow-y-auto">
        {/* Hero Header */}
        <div className="relative rounded-2xl bg-white border border-slate-200 p-6 md:p-8 shadow-xs overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Role-Based Access Control &amp; System Administration
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Extraction History &amp; Audit Intelligence
              </h1>
              <p className="text-slate-600 text-xs md:text-sm mt-1 max-w-2xl font-medium">
                Live monitoring ledger, exact start and completion timestamps, date-wise telemetry, and multi-source job yield analytics.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  isCloudSupabase
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
              >
                {isCloudSupabase ? "Supabase Cloud RLS" : "Local Storage"}
              </span>
            </div>
          </div>
        </div>

        {/* Retained KPI cards & Live Extraction History Dashboard */}
        <ExtractionHistoryDashboard
          initialCatalogCount={jobsCount}
          initialActiveApis={3}
        />

        {/* Candidate Registration Admin Code Manager */}
        <AdminCodeManager />
      </main>
    </div>
  );
}
