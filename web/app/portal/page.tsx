import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySessionToken } from "@/lib/portal-db";
import { PortalDashboard } from "@/components/portal-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "User Dashboard | Job Portal",
  description: "Candidate Job Portal: View verified opportunities, qualification requirements, and apply directly.",
};

export default async function PortalPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_session")?.value;

  if (!token || !getUserBySessionToken(token)) {
    redirect("/login");
  }

  return <PortalDashboard />;
}
