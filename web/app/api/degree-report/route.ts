import { NextRequest, NextResponse } from "next/server";
import { getJobsCatalog } from "@/lib/data-service";
import { generateDegreeCareerReport } from "@/lib/degree-matching";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const degree = searchParams.get("degree") || "bsc";
    const experience = searchParams.get("experience") || "fresher";
    const timeframe = searchParams.get("timeframe") || "30d";
    const search = searchParams.get("search") || "";
    const date = searchParams.get("date") || searchParams.get("dates") || "";

    const { jobs, isCloudSupabase } = await getJobsCatalog();

    const report = generateDegreeCareerReport(jobs, {
      degree,
      experience,
      timeframe,
      search,
      date,
    });

    return NextResponse.json({
      success: true,
      isCloudSupabase,
      report,
    });
  } catch (error: any) {
    console.error("Error generating degree career report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate degree report",
      },
      { status: 500 }
    );
  }
}

