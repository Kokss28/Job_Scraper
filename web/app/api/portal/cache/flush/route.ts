import { NextResponse } from "next/server";
import { invalidateJobsCache } from "@/lib/data-service";

export async function POST() {
  try {
    invalidateJobsCache();
    return NextResponse.json({
      success: true,
      message: "Catalog in-memory cache flushed. Fresh data will be read directly from storage on subsequent queries.",
      flushedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to flush cache" },
      { status: 500 }
    );
  }
}
