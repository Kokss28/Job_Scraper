import { AppNav } from "@/components/app-nav";
import { getJobsCatalog } from "@/lib/data-service";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | null = null;
  let userRole = "recruiter"; // Default role in demo mode
  const { isCloudSupabase } = await getJobsCatalog();

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
      // ignore in offline fallback
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F1F5F9] text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white print:h-auto print:overflow-visible print:bg-white print:block">
      <AppNav
        userEmail={userEmail}
        role={userRole}
        isCloudSupabase={isCloudSupabase}
      />
      <main className="flex-1 min-w-0 flex flex-col bg-[#F1F5F9] h-screen overflow-y-auto print:h-auto print:overflow-visible print:bg-white print:w-full print:block print:p-0">
        {children}
      </main>
    </div>
  );
}
