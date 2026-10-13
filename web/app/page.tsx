import { redirect } from "next/navigation";

import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  if (!hasEnvVars) redirect("/setup");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  redirect(data.user ? "/dashboard" : "/auth/login");
}
