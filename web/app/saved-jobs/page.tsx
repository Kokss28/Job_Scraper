import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { SavedJobsClient, type SavedJobItem } from "@/components/saved-jobs-client";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { getJobsCatalog } from "@/lib/data-service";

export default async function SavedJobsPage() {
  const { isCloudSupabase } = await getJobsCatalog();
  let userEmail: string | null = null;
  let userRole = "user"; // Candidate role for saved jobs workspace
  let serverRecords: SavedJobItem[] = [];

  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userEmail = user.email || null;
        const [{ data: roleRow }, { data: savedRows }] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("saved_jobs")
            .select(
              "job_id,status,notes,created_at,jobs(title,company,city,state,source,link,min_experience_years,max_experience_years)"
            )
            .order("created_at", { ascending: false }),
        ]);

        if (roleRow?.role) userRole = roleRow.role;

        if (savedRows) {
          serverRecords = savedRows
            .filter((r: any) => r.jobs)
            .map((r: any) => ({
              job_id: r.job_id,
              title: r.jobs?.title || "Untitled Role",
              company: r.jobs?.company || "Not Specified",
              location: [r.jobs?.city, r.jobs?.state].filter(Boolean).join(", ") || "India",
              source: r.jobs?.source || "Direct",
              link: r.jobs?.link || "#",
              min_exp: r.jobs?.min_experience_years ?? null,
              max_exp: r.jobs?.max_experience_years ?? null,
              status: (r.status || "saved") as SavedJobItem["status"],
              notes: r.notes || "",
              saved_at: r.created_at,
            }));
        }
      }
    } catch (e) {
      console.warn("Failed fetching live saved jobs:", e);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#070b14] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <AppNav
        userEmail={userEmail}
        role={userRole}
        isCloudSupabase={isCloudSupabase}
      />
      <main className="flex-1 min-w-0 flex flex-col bg-radial-gradient">
        <SavedJobsClient serverRecords={serverRecords} />
      </main>
    </div>
  );
}
