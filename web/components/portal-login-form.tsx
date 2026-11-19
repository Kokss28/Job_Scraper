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
  ShieldCheck,
  Mail,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roleParam = searchParams.get("role");
  const isRegistered = searchParams.get("registered") === "true";
  const userParam = searchParams.get("username");

  const [role, setRole] = useState<"candidate" | "admin">(
    roleParam === "admin" ? "admin" : "candidate"
  );

  // Candidate Form States
  const [username, setUsername] = useState(userParam || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Admin Form States
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (userParam && !username) {
      setUsername(userParam);
    }
  }, [userParam, username]);

  useEffect(() => {
    if (roleParam === "admin") {
      setRole("admin");
    } else if (roleParam === "candidate") {
      setRole("candidate");
    }
  }, [roleParam]);

  // Handle Tab Switch
  const handleRoleSwitch = (newRole: "candidate" | "admin") => {
    setRole(newRole);
    setError(null);
    setSuccess(null);
  };

  // 1. Candidate Login Handler
  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim()) {
      setError("Please enter your registered Username or Email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Incorrect username or password. Please try again.");
      }

      setSuccess(`Welcome back, ${data.user.full_name}! Redirecting to candidate workspace...`);
      setTimeout(() => {
        router.push("/portal");
        router.refresh();
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Admin Login Handler (Supabase Auth)
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!adminEmail.trim()) {
      setError("Please enter your administrator email.");
      return;
    }
    if (!adminPassword) {
      setError("Please enter your administrator password.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (authError) {
        throw authError;
      }

      setSuccess(`Admin authenticated! Welcome back, ${data.user?.email || "Admin"}.`);
      const nextUrl = searchParams.get("next") || "/dashboard";
      setTimeout(() => {
        router.push(nextUrl);
        router.refresh();
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Invalid administrator credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30 mb-3 group hover:scale-105 transition-transform">
          {role === "admin" ? <ShieldCheck className="w-7 h-7" /> : <Briefcase className="w-7 h-7" />}
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          TalentPulse Intelligence Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          {role === "admin"
            ? "Sign in to access admin console, telemetry, and candidate access governance"
            : "Sign in to access verified job openings and track applications"}
        </p>
      </div>

      {/* Main Unified Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl mb-6 border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleRoleSwitch("candidate")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              role === "candidate"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Candidate Login</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch("admin")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              role === "admin"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Login</span>
          </button>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {role === "admin" ? "Administrator Sign In" : "Candidate Sign In"}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {role === "admin" ? "Supabase Cloud Authentication" : "Verified Candidate Workspace"}
            </p>
          </div>

          {role === "candidate" ? (
            <Link
              href="/register"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 transition-colors"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
              <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
              <span>Admin Access</span>
            </span>
          )}
        </div>

        {/* Alerts & Feedback */}
        {role === "candidate" && isRegistered && !success && !error && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <strong className="block text-emerald-950">Registration Complete!</strong>
              Please enter your password below to sign in to your candidate account.
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

        {/* ========================================================= */}
        {/* TAB 1: CANDIDATE LOGIN FORM                               */}
        {/* ========================================================= */}
        {role === "candidate" && (
          <form onSubmit={handleCandidateSubmit} className="space-y-4">
            {/* Username / Name Input */}
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
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. john_doe or candidate@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                />
              </div>
            </div>

            {/* Password Input with Eye Icon */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Candidate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ADMINISTRATOR LOGIN FORM (SUPABASE)                 */}
        {/* ========================================================= */}
        {role === "admin" && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            {/* Admin Email Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Admin Email (Supabase Account)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                />
              </div>
            </div>

            {/* Admin Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Admin Password
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
                  type={showAdminPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showAdminPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Admin Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md shadow-slate-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating with Supabase...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Sign In as Administrator</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {role === "admin" ? (
              <button
                type="button"
                onClick={() => handleRoleSwitch("candidate")}
                className="font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                ← Switch to Candidate Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRoleSwitch("admin")}
                className="font-semibold text-slate-600 hover:text-indigo-600 hover:underline cursor-pointer"
              >
                System Administrator? Sign In →
              </button>
            )}
          </span>
          <span className="font-semibold text-slate-700">
            {role === "admin" ? "Supabase Cloud" : "Invite-Only Access"}
          </span>
        </div>
      </div>
    </div>
  );
}
