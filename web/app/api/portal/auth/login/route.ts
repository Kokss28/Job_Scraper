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

    // Create session token with full user identity for serverless resilience
    const token = createPortalSession(authResult.user);
    const isAdmin =
      authResult.user.role === "admin" ||
      authResult.user.role === "master_admin" ||
      authResult.user.role === "system_admin" ||
      authResult.user.email === "admin@talentpulse.com" ||
      authResult.user.email === "kokilam653@gmail.com";
    const redirectUrl = isAdmin ? "/dashboard" : "/portal";

    const res = NextResponse.json({
      success: true,
      message: isAdmin ? "Administrator authenticated successfully!" : "Login successful!",
      user: authResult.user,
      redirectUrl,
    });

    // Set secure HTTP-only candidate session cookie
    res.cookies.set("portal_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // If admin, also set the admin_session cookie
    if (isAdmin) {
      res.cookies.set("admin_session", "active", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Login failed." }, { status: 500 });
  }
}
