"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isRegistered = searchParams.get("registered") === "true";
  const userParam = searchParams.get("username");
  const nextParam = searchParams.get("next");

  const [identifier, setIdentifier] = useState(userParam || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (userParam && !identifier) {
      setIdentifier(userParam);
    }
  }, [userParam, identifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your Username or Email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. If identifier contains '@', also authenticate with browser Supabase client
      if (cleanId.includes("@")) {
        try {
          const supabase = createClient();
          await supabase.auth.signInWithPassword({
            email: cleanId,
            password,
          });
        } catch {}
      }

      // 2. Authenticate via Unified Auth API (handles both Admin & Candidate)
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanId, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const isRoleAdmin =
          data.user.role === "admin" ||
          data.user.role === "master_admin" ||
          data.user.role === "system_admin" ||
          data.user.email === "admin@talentpulse.com" ||
          data.user.email === "kokilam653@gmail.com";

        const dest = data.redirectUrl || (isRoleAdmin ? "/dashboard" : "/portal");
        const targetUrl = nextParam && nextParam !== "/login" ? nextParam : dest;
        setSuccess(`Welcome back, ${data.user.full_name}! Redirecting...`);
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 500);
        return;
      }

      // 3. Fallback error message if authentication failed
      throw new Error(data.error || "Invalid username or password.");
    } catch (err: any) {
      setError(err?.message || "Sign in failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30 mb-3 group hover:scale-105 transition-transform">
          <Briefcase className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          TalentPulse Intelligence Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Sign in to access your verified candidate workspace or admin console
        </p>
      </div>

      {/* Main Single Login Card (No Tabs) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Sign In</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Enter your credentials to continue
            </p>
          </div>
          <Link
            href="/register"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 transition-colors"
          >
            <span>Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feedback Alerts */}
        {isRegistered && !success && !error && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <strong className="block text-emerald-950">Registration Complete!</strong>
              Please enter your password below to sign in to your verified account.
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>{success}</div>
          </div>
        )}

        {/* Unified Single Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username or Email Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Username or Registered Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. username or name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Single Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Protected Enterprise Access</span>
          <span className="font-semibold text-slate-700">Single Sign-On</span>
        </div>
      </div>
    </div>
  );
}
