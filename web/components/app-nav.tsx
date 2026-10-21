"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Compass,
  Building2,
  Bookmark,
  Terminal,
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
  Lock,
  ChevronRight,
} from "lucide-react";

type AppNavProps = {
  userEmail?: string | null;
  role?: string;
  isCloudSupabase?: boolean;
};

export function AppNav({
  userEmail,
  role: serverRole = "recruiter",
  isCloudSupabase = false,
}: AppNavProps) {
  const pathname = usePathname();
  const [activeRole, setActiveRole] = useState<string>(serverRole);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("job_intel_active_role");
      if (stored && ["user", "recruiter", "admin"].includes(stored)) {
        setActiveRole(stored);
      }
    } catch (e) {}
  }, []);

  const handleSwitchRole = (newRole: string) => {
    setActiveRole(newRole);
    try {
      localStorage.setItem("job_intel_active_role", newRole);
    } catch (e) {}
  };

  const navItems = [
    {
      id: "nav-overview",
      label: "Overview Dashboard",
      href: "/dashboard",
    },
    {
      id: "nav-live-extraction",
      label: "Live Extraction",
      href: "/dashboard/scraper",
    },
    {
      id: "nav-india-map",
      label: "India Job Map",
      href: "/dashboard/market",
    },
    {
      id: "nav-jobs-directory",
      label: "All Jobs Directory",
      href: "/dashboard#directory",
    },
    {
      id: "nav-csv-exports",
      label: "CSV Exports",
      href: "/dashboard#export",
    },
    {
      id: "nav-extraction-history",
      label: "Extraction History",
      href: "/admin",
    },
    {
      id: "nav-settings",
      label: "Settings",
      href: "/setup",
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0B1120] border-r border-slate-800/80 flex flex-col min-h-screen">
      {/* Brand Header */}
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            IN
          </div>
          <div className="text-lg font-bold text-white tracking-tight">
            TalentPulse
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-2 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              data-testid={item.id}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[#1E293B] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  isActive ? "bg-indigo-400 ring-2 ring-indigo-400/40" : "bg-slate-600"
                }`}
              ></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Role Switcher (Persona Simulation for Multi-User Testing) */}
      <div className="px-3 py-3 mx-3 mb-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Active Role (RBAC)
          </span>
          <span
            className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
              activeRole === "admin"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : activeRole === "recruiter"
                ? "bg-violet-500/10 text-violet-400 border-violet-500/30"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
            }`}
          >
            {activeRole}
          </span>
        </div>

        {/* Quick Persona Toggles */}
        <div className="grid grid-cols-3 gap-1 pt-1">
          <button
            type="button"
            data-testid="persona-candidate"
            onClick={() => handleSwitchRole("user")}
            className={`py-1 text-[10px] font-bold rounded transition-all border ${
              activeRole === "user"
                ? "bg-indigo-600 text-white border-indigo-500 shadow"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
            title="Candidate Persona"
          >
            Candidate
          </button>
          <button
            type="button"
            data-testid="persona-recruiter"
            onClick={() => handleSwitchRole("recruiter")}
            className={`py-1 text-[10px] font-bold rounded transition-all border ${
              activeRole === "recruiter"
                ? "bg-violet-600 text-white border-violet-500 shadow"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
            title="Recruiter Persona"
          >
            Recruiter
          </button>
          <button
            type="button"
            data-testid="persona-admin"
            onClick={() => handleSwitchRole("admin")}
            className={`py-1 text-[10px] font-bold rounded transition-all border ${
              activeRole === "admin"
                ? "bg-emerald-600 text-white border-emerald-500 shadow"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
            title="Admin Persona"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Pipeline Status (Matching screenshot widget) */}
      <div className="p-3.5 mx-3 mb-3 rounded-xl bg-[#0F172A] border border-slate-800/90 text-xs shadow-xs">
        <div className="text-xs font-bold text-slate-200">
          Pipeline Status
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>3 Live Feeds Connected</span>
        </div>
      </div>

      {/* Storage Engine Status */}
      <div className="px-3 py-2 mx-3 mb-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] flex items-center justify-between">
        <span className="text-slate-400 font-medium">Database:</span>
        <span
          className={`font-bold ${
            isCloudSupabase ? "text-emerald-400" : "text-indigo-400"
          }`}
        >
          {isCloudSupabase ? "Supabase Cloud" : "Local SQLite / CSV"}
        </span>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
            {activeRole === "admin" ? "A" : activeRole === "recruiter" ? "R" : "C"}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">
              {userEmail ||
                (activeRole === "admin"
                  ? "Admin Supervisor"
                  : activeRole === "recruiter"
                  ? "Lead Recruiter"
                  : "Candidate User")}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              {activeRole} tier
            </div>
          </div>
        </div>

        {userEmail && (
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
