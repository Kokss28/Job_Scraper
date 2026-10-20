"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== repeatPassword) { setError("Passwords do not match"); return; }
    setIsLoading(true); setError(null);
    const { error: signUpError } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
      },
    });
    setIsLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
    router.push("/auth/sign-up-success");
  }

  return <form className="auth-form" onSubmit={handleSignUp}>
    <label htmlFor="full-name">Name<input id="full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
    <label htmlFor="signup-email">Email<input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label htmlFor="signup-password">Password<input id="signup-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    <label htmlFor="repeat-password">Confirm password<input id="repeat-password" type="password" autoComplete="new-password" minLength={8} required value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} /></label>
    {error && <p className="auth-error">{error}</p>}
    <button type="submit" disabled={isLoading}>{isLoading ? "Creating account…" : "Create account"}</button>
    <div className="auth-links"><span>Already registered? <Link href="/auth/login">Sign in</Link></span></div>
  </form>;
}
