"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AppNavProps = {
  userEmail?: string | null;
  role?: string;
  isCloudSupabase?: boolean;
};

export function AppNav({
  userEmail,
  role = "recruiter",
  isCloudSupabase = false,
}: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleAdminSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    {
      id: "nav-overview",
      label: "Overview Dashboard",
      href: "/dashboard",
    },
    {
      id: "nav-degree-advisor",
      label: "Degree Career Advisor",
      href: "/dashboard/degree-advisor",
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
    <aside className="w-64 flex-shrink-0 bg-[#0B1120] border-r border-slate-800/80 flex flex-col h-screen sticky top-0 overflow-y-auto z-40 select-none print:hidden">
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
      <div className="flex-1 py-2 px-3 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              data-testid={item.id}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600/20 text-white border border-indigo-500/40 shadow-xs font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                  isActive ? "bg-indigo-400 ring-4 ring-indigo-500/30" : "bg-slate-500"
                }`}
              ></span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Admin Profile & Sign Out Footer */}
      <div className="p-3.5 border-t border-slate-800/80 mt-auto bg-slate-900/60">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-200 truncate" title={userEmail || "Administrator"}>
                {userEmail || "Admin Console"}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Supabase Live</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdminSignOut}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            title="Sign Out from Admin Console"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
