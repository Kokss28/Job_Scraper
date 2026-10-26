"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <aside className="w-64 flex-shrink-0 bg-[#0B1120] border-r border-slate-800/80 flex flex-col h-screen sticky top-0 overflow-y-auto z-40 select-none">
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
                  ? "bg-indigo-600/20 text-white border border-indigo-500/40 shadow-xs font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  isActive ? "bg-indigo-400 ring-4 ring-indigo-500/30" : "bg-slate-500"
                }`}
              ></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
