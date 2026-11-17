import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySessionToken, applyToJob, getUserApplications, getPortalDb, PortalUser } from "@/lib/portal-db";

// POST: Apply to a Job
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;
    const body = await req.json().catch(() => ({}));
    const jobId = body.jobId;
    const notes = body.notes;
    const clientUserId = body.userId;

    let user: PortalUser | null = token ? getUserBySessionToken(token) : null;

    // Fallback: If cookie is absent/expired, authenticate via registered userId
    if (!user && clientUserId) {
      const db = getPortalDb();
      const row = db.prepare("SELECT * FROM users WHERE user_id = ?").get(clientUserId) as any;
      if (row && row.status !== "Stopped") {
        user = {
          user_id: row.user_id,
          full_name: row.full_name,
          email: row.email,
          mobile_number: row.mobile_number,
          username: row.username,
          address: row.address,
          qualification: row.qualification,
          date_of_birth: row.date_of_birth,
          created_date: row.created_date,
          status: row.status || "Active",
          data_scope_hours: row.data_scope_hours || "all",
          daily_apply_limit: Number(row.daily_apply_limit ?? 10),
        };
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Please log in to apply for jobs." }, { status: 401 });
    }

    if (!jobId) {
      return NextResponse.json({ success: false, error: "Job ID is required." }, { status: 400 });
    }

    const result = applyToJob(user.user_id, jobId, notes);
    if (!result.success) {
      return NextResponse.json({
        success: true,
        alreadyApplied: true,
        message: result.error || "Application already recorded.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully!",
      application: result.application,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to submit application." }, { status: 500 });
  }
}

// GET: List Current User's Applications
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = getUserBySessionToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const applications = getUserApplications(user.user_id);
    return NextResponse.json({
      success: true,
      applications,
      totalCount: applications.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
