import { NextResponse } from "next/server";
import { registerUser, createPortalSession } from "@/lib/portal-db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      adminCode,
      fullName,
      email,
      mobileNumber,
      username,
      password,
      confirmPassword,
      address,
      qualification,
      dateOfBirth,
    } = body;

    // Field validations
    if (!adminCode?.trim()) {
      return NextResponse.json({ success: false, error: "Admin Code is required." }, { status: 400 });
    }
    if (!fullName?.trim()) {
      return NextResponse.json({ success: false, error: "Full Name is required." }, { status: 400 });
    }
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Valid email address is required." }, { status: 400 });
    }
    if (!username?.trim() || username.trim().length < 3) {
      return NextResponse.json({ success: false, error: "Username must be at least 3 characters." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, error: "Password and Confirm Password must match." }, { status: 400 });
    }
    if (!qualification?.trim()) {
      return NextResponse.json({ success: false, error: "Educational qualification is required." }, { status: 400 });
    }

    const regResult = registerUser({
      adminCode,
      fullName,
      email,
      mobileNumber,
      username,
      password,
      address,
      qualification,
      dateOfBirth,
    });

    if (!regResult.success || !regResult.user) {
      return NextResponse.json({ success: false, error: regResult.error }, { status: 400 });
    }

    // Auto-create session token for live login directly to portal dashboard
    const token = createPortalSession(regResult.user.user_id);

    const res = NextResponse.json({
      success: true,
      message: "Account Created Successfully! Welcome to your Job Portal Dashboard.",
      user: regResult.user,
      redirectUrl: "/portal",
    });

    res.cookies.set("portal_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to register user." }, { status: 500 });
  }
}
