import { NextResponse } from "next/server";
import { authenticateUser, createPortalSession } from "@/lib/portal-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username?.trim() || !password) {
      return NextResponse.json({ success: false, error: "Please enter your username and password." }, { status: 400 });
    }

    const authResult = authenticateUser(username, password);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: authResult.error || "Invalid credentials." }, { status: 401 });
    }

    // Create session token
    const token = createPortalSession(authResult.user.user_id);

    const res = NextResponse.json({
      success: true,
      message: "Login successful!",
      user: authResult.user,
    });

    // Set secure HTTP-only cookie
    res.cookies.set("portal_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Login failed." }, { status: 500 });
  }
}
