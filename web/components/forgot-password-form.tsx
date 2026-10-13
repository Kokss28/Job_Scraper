"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const { error: requestError } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/update-password` });
    setBusy(false);
    if (requestError) setError(requestError.message); else setSuccess(true);
  }

  return success ? <div><h1>Check your email</h1><p className="auth-subtitle">If the account exists, password reset instructions are on their way.</p><div className="auth-links"><Link href="/auth/login">Back to sign in</Link></div></div> : <><h1>Reset your password</h1><p className="auth-subtitle">We’ll email you a secure reset link.</p><form className="auth-form" onSubmit={submit}><label htmlFor="reset-email">Email<input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event)=>setEmail(event.target.value)}/></label>{error&&<p className="auth-error">{error}</p>}<button disabled={busy}>{busy?"Sending…":"Send reset link"}</button><div className="auth-links"><Link href="/auth/login">Back to sign in</Link></div></form></>;
}
