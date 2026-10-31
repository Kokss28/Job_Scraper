import { getDashboardStats, getPaginatedJobs } from "@/lib/data-service";
import { TalentPulseDashboard } from "@/components/talent-pulse-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Concurrently fetch pre-aggregated database stats and the first 50 lightweight job cards
  const [stats, paginated] = await Promise.all([
    getDashboardStats(),
    getPaginatedJobs({ page: 1, pageSize: 50 }),
  ]);

  return (
    <TalentPulseDashboard
      initialJobs={paginated.jobs}
      isCloudSupabase={paginated.isCloudSupabase}
      initialStats={stats}
      totalJobsCount={paginated.totalCount || stats.totalJobs}
      initialPage={paginated.page}
      initialTotalPages={paginated.totalPages}
    />
  );
}
