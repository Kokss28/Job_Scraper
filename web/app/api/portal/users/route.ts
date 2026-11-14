import { NextResponse } from "next/server";
import { listRegisteredUsers, toggleUserAccess, updateCandidateUser, getSystemMetrics } from "@/lib/portal-db";

export async function GET() {
  try {
    const users = listRegisteredUsers();
    const metrics = getSystemMetrics();
    return NextResponse.json({
      success: true,
      users,
      totalCount: users.length,
      activeCount: metrics.activeUsers,
      stoppedCount: metrics.stoppedUsers,
      metrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list registered users" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { action, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Candidate User ID is required." },
        { status: 400 }
      );
    }

    if (action === "toggle_status") {
      const { status } = body;
      if (status !== "Active" && status !== "Stopped") {
        return NextResponse.json(
          { success: false, error: "Invalid status. Must be 'Active' or 'Stopped'." },
          { status: 400 }
        );
      }
      const res = toggleUserAccess(userId, status);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      const users = listRegisteredUsers();
      const metrics = getSystemMetrics();
      return NextResponse.json({
        success: true,
        message: status === "Stopped" ? "User access stopped successfully." : "User access restored to active.",
        users,
        metrics,
      });
    }

    if (action === "update") {
      const { data } = body;
      if (!data || !data.fullName || !data.email) {
        return NextResponse.json(
          { success: false, error: "Full Name and Email are required." },
          { status: 400 }
        );
      }

      const res = updateCandidateUser(userId, data);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      const users = listRegisteredUsers();
      const metrics = getSystemMetrics();
      return NextResponse.json({
        success: true,
        message: "Candidate profile and access updated successfully.",
        users,
        metrics,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported: 'toggle_status', 'update'." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update user access" },
      { status: 500 }
    );
  }
}
