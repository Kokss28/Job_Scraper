import { NextResponse } from "next/server";
import { getJobFullDescription } from "@/lib/data-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ success: false, error: "Missing job ID" }, { status: 400 });
    }

    const description = await getJobFullDescription(jobId);
    return NextResponse.json({
      success: true,
      jobId,
      full_description: description || "Detailed role summary and core technical responsibilities as specified by employer.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to fetch job description" }, { status: 500 });
  }
}
