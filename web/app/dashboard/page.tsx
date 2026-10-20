import { getJobsCatalog } from "@/lib/data-service";
import { JobExplorerClient } from "@/components/job-explorer-client";

export default async function DashboardPage() {
  const { jobs } = await getJobsCatalog();

  return <JobExplorerClient initialJobs={jobs} />;
}
