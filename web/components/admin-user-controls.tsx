"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminUserControls({ userId, role, active }: { userId: string; role: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function updateRole(nextRole: string) {
    setBusy(true); setMessage("");
    const { error } = await createClient().rpc("admin_set_user_role", { target_user_id: userId, new_role: nextRole });
    setMessage(error ? "Role update failed" : "Role updated");
    setBusy(false);
    if (!error) window.location.reload();
  }

  async function updateActive(nextActive: boolean) {
    setBusy(true); setMessage("");
    const { error } = await createClient().rpc("admin_set_user_active", { target_user_id: userId, new_active: nextActive });
    setMessage(error ? "Account update failed" : "Account updated");
    setBusy(false);
    if (!error) window.location.reload();
  }

  return <div className="admin-controls"><select value={role} disabled={busy} onChange={(event) => updateRole(event.target.value)} aria-label="User role"><option value="user">User</option><option value="admin">Admin</option></select><button className={`button ${active ? "button-muted" : "button-primary"}`} disabled={busy} onClick={() => updateActive(!active)}>{active ? "Deactivate" : "Activate"}</button>{message && <small>{message}</small>}</div>;
}
