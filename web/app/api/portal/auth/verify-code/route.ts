import { NextResponse } from "next/server";
import { verifyAdminCode } from "@/lib/portal-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = body.code || "";

    const result = verifyAdminCode(code);
    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
