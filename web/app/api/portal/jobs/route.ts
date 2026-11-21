import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPaginatedJobs, getDashboardStats, getSourceBreakdown } from "@/lib/data-service";
import { getUserBySessionToken, getUserAppliedJobIds, getUserTodayAppliedCount } from "@/lib/portal-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);
    const query = searchParams.get("query") || "";
    const city = searchParams.get("city") || "";
    const skill = searchParams.get("skill") || "";
    const source = searchParams.get("source") || "";
    const experience = searchParams.get("experience") || "";

    // Check optional authenticated user to enrich jobs with isApplied and respect candidate data scope
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;
    let appliedJobIds: string[] = [];
    let userScopeHours: number | undefined = undefined;
    let userScopeStr = "all";
    let todayAppliedCount = 0;
    let dailyApplyLimit = 10;
    let isDailyLimitReached = false;

    if (token) {
      const user = getUserBySessionToken(token);
      if (user) {
        appliedJobIds = getUserAppliedJobIds(user.user_id);
        todayAppliedCount = getUserTodayAppliedCount(user.user_id);
        dailyApplyLimit = user.daily_apply_limit !== undefined && user.daily_apply_limit !== null ? Number(user.daily_apply_limit) : 10;
        isDailyLimitReached = dailyApplyLimit > 0 && todayAppliedCount >= dailyApplyLimit;
        userScopeStr = user.data_scope_hours || "all";
        if (userScopeStr !== "all") {
          const parsed = parseInt(userScopeStr, 10);
          if (!isNaN(parsed) && parsed > 0) {
            userScopeHours = parsed;
          }
        }
      }
    }

    // Determine effective hours filter (candidate scope is enforced as upper bound if set)
    const queryHoursParam = searchParams.get("hours");
    let effectiveHours: number | undefined = userScopeHours;
    if (queryHoursParam) {
      const qHours = parseInt(queryHoursParam, 10);
      if (!isNaN(qHours) && qHours > 0) {
        effectiveHours = userScopeHours !== undefined ? Math.min(userScopeHours, qHours) : qHours;
      }
    }

    const [paginated, stats, sourceBreakdown] = await Promise.all([
      getPaginatedJobs({
        page,
        pageSize,
        query,
        city,
        skill,
        source,
        experience,
        hours: effectiveHours,
      }),
      getDashboardStats(),
      getSourceBreakdown(effectiveHours),
    ]);

    // Enrich jobs with applied flag, realistic posting freshness and active status
    const enrichedJobs = paginated.jobs.map((job) => {
      const isApplied = appliedJobIds.includes(job.job_id);

      let postedAgo = "Recently added";
      let postedDate = "Recently";
      if (job.collected_at) {
        try {
          const d = new Date(job.collected_at);
          const now = new Date();
          const diffMs = Math.max(0, now.getTime() - d.getTime());
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffHours / 24);

          postedDate = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          if (diffHours < 1) {
            postedAgo = "Just now";
          } else if (diffHours < 24) {
            postedAgo = `Posted ${diffHours}h ago`;
          } else if (diffDays === 1) {
            postedAgo = "Posted yesterday";
          } else if (diffDays < 7) {
            postedAgo = `Posted ${diffDays}d ago`;
          } else {
            postedAgo = `Posted on ${postedDate}`;
          }
        } catch {}
      }

      return {
        ...job,
        isApplied,
        posted_ago: postedAgo,
        posted_date: postedDate,
        hiring_status: "⚡ Actively Hiring",
        deadline: `Open • ${postedAgo}`,
        job_type: (job as any).job_type || "Full-time",
        salary: (job as any).salary || "Best in Industry / Commensurate with experience",
      };
    });

    return NextResponse.json({
      success: true,
      jobs: enrichedJobs,
      totalCount: paginated.totalCount,
      page: paginated.page,
      pageSize: paginated.pageSize,
      totalPages: paginated.totalPages,
      totalCatalogCount: sourceBreakdown.all || paginated.totalCount,
      sourceCounts: sourceBreakdown,
      totalAppliedCount: appliedJobIds.length,
      todayAppliedCount,
      dailyApplyLimit,
      isDailyLimitReached,
      dataScopeHours: userScopeStr,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load jobs" },
      { status: 500 }
    );
  }
}
