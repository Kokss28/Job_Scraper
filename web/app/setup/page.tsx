import { Settings } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { getJobsCatalog } from "@/lib/data-service";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { getSystemSettings, getSystemMetrics } from "@/lib/portal-db";
import { AdminSettingsPanel } from "@/components/admin-settings-panel";

export default async function SetupPage() {
  let userEmail: string | null = null;
  let userRole = "recruiter";
  const { isCloudSupabase, jobs } = await getJobsCatalog();
  const systemSettings = getSystemSettings();
  const systemMetrics = getSystemMetrics();

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
      <main className="flex-1 min-w-0 flex flex-col p-6 md:p-8 space-y-6 max-w-7xl mx-auto h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
              <Settings className="w-3.5 h-3.5" />
              Application &amp; Ingestion Governance
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              System Settings &amp; Platform Controls
            </h1>
            <p className="text-slate-600 text-xs md:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
              Configure candidate portal registration access, scraper execution parameters, and in-memory cache lifecycle.
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

        {/* Real Interactive Settings Panel */}
        <AdminSettingsPanel
          initialSettings={systemSettings}
          initialMetrics={systemMetrics}
          totalJobs={jobs.length}
          isCloudSupabase={isCloudSupabase}
        />
      </main>
    </div>
  );
}
