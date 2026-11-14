import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySessionToken, applyToJob, getUserApplications } from "@/lib/portal-db";

// POST: Apply to a Job
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Please log in to apply for jobs." }, { status: 401 });
    }

    const user = getUserBySessionToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "Session expired. Please log in again." }, { status: 401 });
    }

    const body = await req.json();
    const jobId = body.jobId;
    const notes = body.notes;

    if (!jobId) {
      return NextResponse.json({ success: false, error: "Job ID is required." }, { status: 400 });
    }

    const result = applyToJob(user.user_id, jobId, notes);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
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
