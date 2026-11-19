import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySessionToken } from "@/lib/portal-db";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const candidateToken = cookieStore.get("portal_session")?.value;

  // 1. If candidate is logged in -> Candidate Dashboard
  if (candidateToken && getUserBySessionToken(candidateToken)) {
    redirect("/portal");
  }

  // 2. If administrator is logged in with Supabase -> Admin Dashboard
  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        redirect("/dashboard");
      }
    } catch {}
  }

  // 3. Unauthenticated -> Unified Login with role switcher
  redirect("/login");
}
