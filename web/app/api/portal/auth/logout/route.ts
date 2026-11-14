import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/portal-db";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;
    if (token) {
      destroySession(token);
    }

    const res = NextResponse.json({ success: true, message: "Logged out successfully" });
    res.cookies.delete("portal_session");
    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Logout failed" }, { status: 500 });
  }
}
