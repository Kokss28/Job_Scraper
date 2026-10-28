import { NextRequest, NextResponse } from "next/server";
import { getJobsCatalog, invalidateJobsCache } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";
    const statsOnly = searchParams.get("statsOnly") === "true";

    if (forceRefresh) {
      invalidateJobsCache();
    }

    const { jobs, isCloudSupabase } = await getJobsCatalog();
    const total = jobs.length;

    // Determine jobs collected today using current UTC calendar date (scraper timestamps are in UTC)
    // as well as local date
    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10);
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    let todayCount = 0;
    let latestTime = 0;

    for (const j of jobs) {
      if (j.collected_at) {
        const col = String(j.collected_at);
        if (col.startsWith(todayUtc) || col.startsWith(todayLocal)) {
          todayCount++;
        }
        const t = new Date(col).getTime();
        if (!isNaN(t) && t > latestTime) {
          latestTime = t;
        }
      }
    }

    // Accurate day-over-day growth percentage
    const baseline = Math.max(1, total - todayCount);
    const growthPercentage = total > 0 ? (todayCount / baseline) * 100 : 0;
    const formattedGrowth = todayCount > 0 ? `↑ +${growthPercentage.toFixed(1)}% today` : `0.0% today`;

    return NextResponse.json({
      success: true,
      total,
      todayCount,
      growthPercentage: Number(growthPercentage.toFixed(2)),
      formattedGrowth,
      latestCollectedAt: latestTime > 0 ? new Date(latestTime).toISOString() : null,
      isCloudSupabase,
      ...(statsOnly ? {} : { jobs }),
    });
  } catch (error: any) {
    console.error("API /api/jobs error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch jobs catalog" },
      { status: 500 }
    );
  }
}
