import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPaginatedJobs, getDashboardStats } from "@/lib/data-service";
import { getUserBySessionToken, getUserAppliedJobIds } from "@/lib/portal-db";

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

    // Check optional authenticated user to enrich jobs with isApplied
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;
    let appliedJobIds: string[] = [];

    if (token) {
      const user = getUserBySessionToken(token);
      if (user) {
        appliedJobIds = getUserAppliedJobIds(user.user_id);
      }
    }

    const [paginated, stats] = await Promise.all([
      getPaginatedJobs({
        page,
        pageSize,
        query,
        city,
        skill,
        source,
        experience,
      }),
      getDashboardStats(),
    ]);

    // Enrich jobs with applied flag and deadline estimates
    const enrichedJobs = paginated.jobs.map((job) => {
      const isApplied = appliedJobIds.includes(job.job_id);

      // Estimate application deadline (e.g. 30 days from collected_at or future date)
      let deadline = "Open until filled";
      if (job.collected_at) {
        try {
          const d = new Date(job.collected_at);
          d.setDate(d.getDate() + 30);
          deadline = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        } catch {}
      }

      return {
        ...job,
        isApplied,
        deadline,
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
      totalCatalogCount: stats.totalJobs || 11819,
      totalAppliedCount: appliedJobIds.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load jobs" },
      { status: 500 }
    );
  }
}
