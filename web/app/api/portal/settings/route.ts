import { NextResponse } from "next/server";
import { getSystemSettings, updateSystemSettings, getSystemMetrics } from "@/lib/portal-db";

export async function GET() {
  try {
    const settings = getSystemSettings();
    const metrics = getSystemMetrics();
    return NextResponse.json({
      success: true,
      settings,
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load system settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body.settings !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid payload. 'settings' object required." },
        { status: 400 }
      );
    }

    updateSystemSettings(body.settings);
    const updatedSettings = getSystemSettings();
    const metrics = getSystemMetrics();

    return NextResponse.json({
      success: true,
      message: "System configuration updated successfully.",
      settings: updatedSettings,
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save system settings" },
      { status: 500 }
    );
  }
}
