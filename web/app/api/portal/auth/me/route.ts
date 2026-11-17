import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySessionToken, getUserAppliedCount, getUserAppliedJobIds, getUserTodayAppliedCount } from "@/lib/portal-db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_session")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = getUserBySessionToken(token);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const appliedJobIds = getUserAppliedJobIds(user.user_id);
    const todayApplied = getUserTodayAppliedCount(user.user_id);
    const dailyLimit = user.daily_apply_limit !== undefined && user.daily_apply_limit !== null ? Number(user.daily_apply_limit) : 10;
    const isDailyLimitReached = dailyLimit > 0 && todayApplied >= dailyLimit;

    return NextResponse.json({
      authenticated: true,
      user,
      totalApplied: appliedJobIds.length,
      todayApplied,
      dailyApplyLimit: dailyLimit,
      isDailyLimitReached,
      appliedJobIds,
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err?.message }, { status: 500 });
  }
}
