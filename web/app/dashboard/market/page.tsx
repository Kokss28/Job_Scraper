import { getJobsCatalog } from "@/lib/data-service";
import { MarketInsightsClient } from "@/components/market-insights-client";

export default async function MarketPage() {
  const { jobs } = await getJobsCatalog();

  return <MarketInsightsClient jobs={jobs} />;
}
