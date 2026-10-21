import { getJobsCatalog } from "@/lib/data-service";
import { TalentPulseDashboard } from "@/components/talent-pulse-dashboard";

export default async function DashboardPage() {
  const { jobs, isCloudSupabase } = await getJobsCatalog();

  return <TalentPulseDashboard initialJobs={jobs} isCloudSupabase={isCloudSupabase} />;
}
