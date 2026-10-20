import { getJobsCatalog } from "@/lib/data-service";
import { ExperienceIntelClient } from "@/components/experience-intel-client";

export default async function ExperiencePage() {
  const { jobs } = await getJobsCatalog();

  return <ExperienceIntelClient jobs={jobs} />;
}
