"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) setError(updateError.message);
    else setDone(true);
  }

  return done ? <><h1>Password updated</h1><p className="auth-subtitle">Your password has been changed.</p><div className="auth-links"><Link href="/dashboard">Continue to dashboard</Link></div></> : <><h1>Choose a new password</h1><p className="auth-subtitle">Enter a new password for your account.</p><form className="auth-form" onSubmit={submit}><label htmlFor="new-password">New password<input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}<button disabled={busy}>{busy ? "Updating…" : "Update password"}</button></form></>;
}
