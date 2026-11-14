import { NextResponse } from "next/server";
import { listAdminCodes, generateAdminCode, getPortalDb } from "@/lib/portal-db";

// GET: List all Admin Codes & statistics
export async function GET() {
  try {
    const codes = listAdminCodes();
    const totalCount = codes.length;
    const unusedCount = codes.filter((c) => c.status === "Unused").length;
    const usedCount = codes.filter((c) => c.status === "Used").length;

    return NextResponse.json({
      success: true,
      codes,
      totalCount,
      unusedCount,
      usedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to list codes" }, { status: 500 });
  }
}

// POST: Generate a new Admin Code
export async function POST(req: Request) {
  try {
    let prefix = "ADM-2026";
    try {
      const body = await req.json();
      if (body.prefix?.trim()) {
        prefix = body.prefix.trim().toUpperCase();
      }
    } catch {}

    const newCode = generateAdminCode(prefix);
    return NextResponse.json({
      success: true,
      message: `Admin Code ${newCode} generated successfully!`,
      code: newCode,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to generate code" }, { status: 500 });
  }
}
