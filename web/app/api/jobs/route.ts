import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats, getPaginatedJobs, invalidateJobsCache } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";
    const statsOnly = searchParams.get("statsOnly") === "true";

    if (forceRefresh) {
      invalidateJobsCache();
    }

    // High-speed pre-aggregated stats (< 25 KB)
    const stats = await getDashboardStats();

    if (statsOnly) {
      return NextResponse.json({
        success: true,
        total: stats.totalJobs,
        byLocation: stats.byLocation,
        topSkills: stats.topSkills,
        dailyTrend: stats.dailyTrend,
        isCloudSupabase: stats.isCloudSupabase,
      });
    }

    // Server-side paginated jobs query
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const city = searchParams.get("city") || "";
    const state = searchParams.get("state") || "";
    const skill = searchParams.get("skill") || "";
    const hours = parseInt(searchParams.get("hours") || "0", 10);

    const paginated = await getPaginatedJobs({
      page,
      pageSize,
      query,
      city,
      state,
      skill,
      hours: hours > 0 ? hours : undefined,
    });

    return NextResponse.json({
      success: true,
      total: paginated.totalCount,
      page: paginated.page,
      pageSize: paginated.pageSize,
      totalPages: paginated.totalPages,
      jobs: paginated.jobs,
      isCloudSupabase: paginated.isCloudSupabase,
      stats: {
        totalJobs: stats.totalJobs,
        byLocation: stats.byLocation,
        topSkills: stats.topSkills,
      },
    });
  } catch (error: any) {
    console.error("API /api/jobs error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch jobs data" },
      { status: 500 }
    );
  }
}
