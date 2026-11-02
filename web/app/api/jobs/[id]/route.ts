import { NextRequest, NextResponse } from "next/server";
import { getJobFullDescription } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Job ID required" }, { status: 400 });
    }

    const description = await getJobFullDescription(decodeURIComponent(id));
    if (!description) {
      return NextResponse.json({ success: false, error: "Job description not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      jobId: id,
      fullDescription: description,
    });
  } catch (error: any) {
    console.error("Error fetching job description:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch description" },
      { status: 500 }
    );
  }
}
