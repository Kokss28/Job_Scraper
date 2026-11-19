"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Lock,
  Sliders,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCheck,
  UserX,
  Edit3,
  KeyRound,
  Check,
  Sparkles,
  Share2,
  Copy,
  X,
  Clock,
  Globe,
  ExternalLink,
} from "lucide-react";

type CandidateUser = {
  user_id: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  username: string;
  address: string | null;
  qualification: string | null;
  college_name?: string | null;
  date_of_birth: string | null;
  created_date: string;
  status: "Active" | "Stopped";
  used_admin_code: string | null;
  total_applications: number;
  today_applications?: number;
  data_scope_hours?: string;
  daily_apply_limit?: number;
};

interface AdminSettingsPanelProps {
  initialSettings: Record<string, string>;
  initialMetrics: {
    totalUsers: number;
    activeUsers?: number;
    stoppedUsers?: number;
    totalApplications: number;
    totalCodes: number;
    unusedCodes: number;
    usedCodes: number;
  };
  totalJobs: number;
  isCloudSupabase: boolean;
}

export function AdminSettingsPanel({
  initialSettings,
  initialMetrics,
  totalJobs,
  isCloudSupabase,
}: AdminSettingsPanelProps) {
  const [metrics, setMetrics] = useState(initialMetrics);

  // Cache flush state
  const [isFlushing, setIsFlushing] = useState(false);
  const [flushMessage, setFlushMessage] = useState<string | null>(null);

  // Invite code & share link generator
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [latestInviteCode, setLatestInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [copiedLocalhostLink, setCopiedLocalhostLink] = useState(false);
  const [inviteScopePreset, setInviteScopePreset] = useState<string>("all");
  const [inviteCustomHours, setInviteCustomHours] = useState<string>("24");
  const [inviteDailyLimit, setInviteDailyLimit] = useState<number>(10);
  const [publicDomain, setPublicDomain] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("portal_public_domain");
      if (saved) {
        setPublicDomain(saved);
      } else {
        const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
        if (vercelEnv) {
          setPublicDomain(`https://${vercelEnv}`);
        }
      }
    }
  }, []);

  const getActiveBaseUrl = useCallback(() => {
    if (publicDomain.trim()) {
      let d = publicDomain.trim().replace(/\/+$/, "");
      if (!d.startsWith("http://") && !d.startsWith("https://")) {
        d = `https://${d}`;
      }
      return d;
    }
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }, [publicDomain]);

  const handlePublicDomainChange = (val: string) => {
    setPublicDomain(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("portal_public_domain", val.trim());
    }
  };

  // Candidate Users Management
  const [users, setUsers] = useState<CandidateUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userActionMsg, setUserActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingUser, setEditingUser] = useState<CandidateUser | null>(null);
  const [editScopePreset, setEditScopePreset] = useState<string>("all");
  const [editCustomHours, setEditCustomHours] = useState<string>("24");
  const [editDailyLimit, setEditDailyLimit] = useState<number>(10);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/portal/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    setInviteError(null);
    try {
      const finalScope = inviteScopePreset === "custom" ? (inviteCustomHours.trim() || "24") : inviteScopePreset;
      const res = await fetch("/api/portal/admin-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: "ADM-2026",
          dataScopeHours: finalScope,
          dailyApplyLimit: inviteDailyLimit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLatestInviteCode(data.code);
        setInviteError(null);
        setMetrics((prev) => ({
          ...prev,
          totalCodes: prev.totalCodes + 1,
          unusedCodes: prev.unusedCodes + 1,
        }));
      } else {
        setInviteError(data.error || "Failed to generate invite code.");
      }
    } catch (err: any) {
      console.error(err);
      setInviteError(err?.message || "Failed to connect to portal server. Ensure dev server is running.");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteLink = (code: string, forceLocal = false) => {
    let base = getActiveBaseUrl();
    if (forceLocal && typeof window !== "undefined") {
      base = window.location.origin;
    }
    const url = `${base}/register?code=${code}`;
    navigator.clipboard.writeText(url);
    if (forceLocal) {
      setCopiedLocalhostLink(true);
      setTimeout(() => setCopiedLocalhostLink(false), 2500);
    } else {
      setCopiedInviteLink(true);
      setTimeout(() => setCopiedInviteLink(false), 2500);
    }
  };

  const handleToggleUserAccess = async (user: CandidateUser) => {
    const nextStatus = user.status === "Stopped" ? "Active" : "Stopped";
    setUserActionMsg(null);

    try {
      const res = await fetch("/api/portal/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_status",
          userId: user.user_id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user status");
      }
      setUsers(data.users);
      if (data.metrics) setMetrics(data.metrics);
      setUserActionMsg({
        type: "success",
        text: `Access for ${user.full_name} is now ${nextStatus === "Stopped" ? "STOPPED (Revoked)" : "ACTIVE"}.`,
      });
      setTimeout(() => setUserActionMsg(null), 3500);
    } catch (err: any) {
      setUserActionMsg({ type: "error", text: err.message || "Action failed." });
    }
  };

  const openEditModal = (cand: CandidateUser) => {
    setEditingUser(cand);
    const scope = (cand.data_scope_hours || "all").trim();
    if (scope === "all" || scope === "24" || scope === "48" || scope === "72") {
      setEditScopePreset(scope);
      setEditCustomHours("24");
    } else {
      setEditScopePreset("custom");
      setEditCustomHours(scope);
    }
    const rawLimit = cand.daily_apply_limit !== undefined && cand.daily_apply_limit !== null ? cand.daily_apply_limit : 10;
    setEditDailyLimit(rawLimit >= 999 ? 0 : rawLimit);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingEdit(true);

    try {
      const finalScope = editScopePreset === "custom" ? (editCustomHours.trim() || "24") : editScopePreset;

      const res = await fetch("/api/portal/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          userId: editingUser.user_id,
          data: {
            fullName: editingUser.full_name,
            email: editingUser.email,
            mobileNumber: editingUser.mobile_number,
            qualification: editingUser.qualification,
            collegeName: editingUser.college_name,
            address: editingUser.address,
            status: editingUser.status,
            dataScopeHours: finalScope,
            dailyApplyLimit: editDailyLimit,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save user changes");
      }
      setUsers(data.users);
      if (data.metrics) setMetrics(data.metrics);
      setEditingUser(null);
      setUserActionMsg({
        type: "success",
        text: `Candidate profile & quota (${editDailyLimit > 0 ? `${editDailyLimit} jobs/day` : "Unlimited"}) for ${editingUser.full_name} updated successfully.`,
      });
      setTimeout(() => setUserActionMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to save changes");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const renderQuotaBadge = (cand: CandidateUser) => {
    const limit = cand.daily_apply_limit !== undefined && cand.daily_apply_limit !== null ? cand.daily_apply_limit : 10;
    const today = cand.today_applications || 0;
    const isUnlimited = limit === 0 || limit >= 999;
    const isLocked = !isUnlimited && limit > 0 && today >= limit;

    if (isUnlimited) {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 whitespace-nowrap shadow-2xs">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Unlimited</span>
        </span>
      );
    }

    if (isLocked) {
      return (
        <span
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black border border-rose-200 whitespace-nowrap animate-pulse"
          title={`Daily limit reached (${today}/${limit} applied today). Job openings are locked for this candidate.`}
        >
          <Lock className="w-3 h-3 text-rose-600" />
          <span>{today} / {limit} Locked</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200 whitespace-nowrap shadow-2xs">
        <span>{today} / {limit} Today</span>
      </span>
    );
  };

  const renderScopeBadge = (scopeHours?: string) => {
    const scope = (scopeHours || "all").trim();
    if (scope === "all") {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 whitespace-nowrap shadow-2xs">
          <Globe className="w-3 h-3 text-emerald-600" />
          <span>All Data</span>
        </span>
      );
    }
    if (scope === "24") {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-200 whitespace-nowrap shadow-2xs">
          <Clock className="w-3 h-3 text-sky-600" />
          <span>Last 24h</span>
        </span>
      );
    }
    if (scope === "48") {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200 whitespace-nowrap shadow-2xs">
          <Clock className="w-3 h-3 text-blue-600" />
          <span>Last 48h</span>
        </span>
      );
    }
    if (scope === "72") {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200 whitespace-nowrap shadow-2xs">
          <Clock className="w-3 h-3 text-indigo-600" />
          <span>Last 72h</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-[11px] font-bold border border-violet-200 whitespace-nowrap shadow-2xs">
        <Clock className="w-3 h-3 text-violet-600" />
        <span>Last {scope}h</span>
      </span>
    );
  };

  const handleFlushCache = async () => {
    setIsFlushing(true);
    setFlushMessage(null);
    try {
      const res = await fetch("/api/portal/cache/flush", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setFlushMessage("Catalog in-memory cache flushed successfully. Storage re-indexed.");
        setTimeout(() => setFlushMessage(null), 4000);
      } else {
        setFlushMessage("Cache flush failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      setFlushMessage("Network error while flushing cache.");
    } finally {
      setIsFlushing(false);
    }
  };

  const activeCandidatesCount = users.filter((u) => u.status !== "Stopped").length;
  const stoppedCandidatesCount = users.filter((u) => u.status === "Stopped").length;

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5" />
            Simple System Governance
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            Candidate Access Policy &amp; Platform Controls
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Generate candidate share links, monitor registered accounts, and manage user login access live.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isCloudSupabase
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}
          >
            {isCloudSupabase ? "Supabase Cloud: Connected" : "Local SQLite Mode"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CANDIDATE ACCESS POLICY & INVITE GENERATOR                     */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              Candidate Access Policy
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Registration is invite-only. Generate single-use invitation links for new candidates.
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Invite-Only Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Strictly Invite-Only Policy Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Registration Policy
              </span>
            </div>
            <div className="text-sm font-black text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>Strictly Invite-Only</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Every candidate requires a verified, single-use Admin Code to register. Generate a shareable link on the right to invite new candidates.
            </p>
          </div>

          {/* Right: Instant Share Link Generator */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                  Generate &amp; Share Invite Link
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Auto-fills and verifies the code on candidate registration.
                </span>
              </div>
              <button
                type="button"
                onClick={handleGenerateInvite}
                disabled={isGeneratingInvite}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isGeneratingInvite ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Generate Link</span>
              </button>
            </div>

            {/* Scope selection for new invites */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Default Data Scope:
                </span>
                <select
                  value={inviteScopePreset}
                  onChange={(e) => setInviteScopePreset(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="all">All Live Data (Full Catalog)</option>
                  <option value="24">Last 24 Hours (1 Day)</option>
                  <option value="48">Last 48 Hours (2 Days)</option>
                  <option value="72">Last 72 Hours (3 Days)</option>
                  <option value="custom">Custom Hours...</option>
                </select>
              </div>

              {inviteScopePreset === "custom" && (
                <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 animate-in fade-in">
                  <span className="text-[11px] font-medium text-slate-600">Hours allotted:</span>
                  <input
                    type="number"
                    min="1"
                    max="8760"
                    value={inviteCustomHours}
                    onChange={(e) => setInviteCustomHours(e.target.value)}
                    placeholder="e.g. 24, 48, 72"
                    className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <span className="text-[11px] text-slate-400">hours from posting</span>
                </div>
              )}

              {/* Daily Application Limit for Invite */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1.5 border-t border-slate-100">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  Daily Apply Limit:
                </span>
                <select
                  value={inviteDailyLimit}
                  onChange={(e) => setInviteDailyLimit(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value={5}>5 Jobs / Day</option>
                  <option value={10}>10 Jobs / Day (Default)</option>
                  <option value={15}>15 Jobs / Day</option>
                  <option value={20}>20 Jobs / Day</option>
                  <option value={25}>25 Jobs / Day</option>
                  <option value={50}>50 Jobs / Day</option>
                  <option value={0}>Unlimited</option>
                </select>
              </div>
              {/* Candidate Share Domain (Vercel / Production Domain) */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    Share Domain (Vercel / Public URL):
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Used for copied candidate links
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={publicDomain}
                    onChange={(e) => handlePublicDomainChange(e.target.value)}
                    placeholder={
                      typeof window !== "undefined" && window.location.origin.includes("localhost")
                        ? "e.g. https://job-scraper-kokss28.vercel.app"
                        : "Current site origin"
                    }
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                  />
                  {publicDomain && (
                    <button
                      type="button"
                      onClick={() => handlePublicDomainChange("")}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                      title="Reset to browser default"
                    >
                      Reset
                    </button>
                  )}
                </div>
                {typeof window !== "undefined" && window.location.origin.includes("localhost") && !publicDomain && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-md p-1.5 leading-snug">
                    ⚠️ <strong>Notice:</strong> You are viewing on <code>localhost:3000</code>. Candidates cannot open localhost links on their own devices. Enter your <strong>live Vercel URL</strong> above so copied links work everywhere.
                  </p>
                )}
              </div>
            </div>

            {inviteError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                <span>⚠️ {inviteError}</span>
                <button
                  type="button"
                  onClick={() => setInviteError(null)}
                  className="text-rose-500 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {latestInviteCode ? (
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-indigo-950 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                      Code: {latestInviteCode}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white text-indigo-700 font-bold border border-indigo-200">
                      {inviteScopePreset === "custom" ? `${inviteCustomHours || 24}h Scope` : inviteScopePreset === "all" ? "All Data" : `${inviteScopePreset}h Scope`}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white text-amber-800 font-bold border border-amber-200">
                      {inviteDailyLimit > 0 ? `${inviteDailyLimit}/day limit` : "Unlimited"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(latestInviteCode, false)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    >
                      {copiedInviteLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedInviteLink ? "Copied Share Link!" : "Copy Share Link"}</span>
                    </button>
                    {typeof window !== "undefined" && window.location.origin.includes("localhost") && publicDomain && (
                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(latestInviteCode, true)}
                        className="px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="Copy as http://localhost:3000 link for local testing"
                      >
                        {copiedLocalhostLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLocalhostLink ? "Copied Local!" : "Localhost URL"}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider flex items-center justify-between">
                    <span>Generated Invitation Link (Send to Candidate):</span>
                    {getActiveBaseUrl().includes("localhost") && (
                      <span className="text-amber-700 font-semibold lowercase">
                        (warning: localhost link)
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-indigo-900 bg-white p-2.5 rounded-lg border border-indigo-200 truncate select-all flex items-center justify-between gap-2">
                    <span className="truncate">{`${getActiveBaseUrl()}/register?code=${latestInviteCode}`}</span>
                    <a
                      href={`${getActiveBaseUrl()}/register?code=${latestInviteCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2.5 px-3 rounded-lg bg-white border border-dashed border-slate-300 text-center text-slate-500 text-xs font-medium">
                Click &quot;Generate Link&quot; to create a one-click invite for a new candidate.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: LIVE USER ACCESS DIRECTORY (COUNT, STOP & EDIT ACCESS)         */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Registered Candidate Accounts &amp; Access Controls
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live user directory: monitor candidate count, stop login access, or edit profile information.
            </p>
          </div>

          {/* User Count Badges */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
              Total Users: <strong className="text-indigo-600 font-black">{users.length}</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
              Active: <strong className="font-black">{activeCandidatesCount}</strong>
            </span>
            {stoppedCandidatesCount > 0 && (
              <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                Stopped: <strong className="font-black">{stoppedCandidatesCount}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoadingUsers}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Refresh users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Action Alert Banner */}
        {userActionMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
              userActionMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {userActionMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{userActionMsg.text}</span>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-800 min-w-[1000px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">Candidate Profile</th>
                <th className="py-3 px-4 whitespace-nowrap">Contact Info</th>
                <th className="py-3 px-4 whitespace-nowrap">Qualification</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Data Scope</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Daily Quota</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Access Status</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Applications</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {isLoadingUsers && users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading candidate accounts...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No candidates registered yet. Share an invite link to onboard users.
                  </td>
                </tr>
              ) : (
                users.map((cand) => {
                  const isStopped = cand.status === "Stopped";
                  const isAdminUser =
                    String(cand.user_id || "").startsWith("usr_admin") ||
                    cand.email === "admin@talentpulse.com" ||
                    cand.username === "admin" ||
                    cand.email === "kokilam653@gmail.com";

                  return (
                    <tr
                      key={cand.user_id}
                      className={`transition-colors ${
                        isStopped ? "bg-rose-50/30 hover:bg-rose-50/50" : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* Name & Username */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isStopped
                                ? "bg-rose-100 text-rose-700"
                                : isAdminUser
                                ? "bg-amber-100 text-amber-800"
                                : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {cand.full_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{cand.full_name}</span>
                              {isAdminUser && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">@{cand.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-[11px] space-y-0.5">
                          <div className="text-slate-800 font-medium">{cand.email}</div>
                          <div className="text-slate-500 font-mono">{cand.mobile_number || "No phone"}</div>
                        </div>
                      </td>

                      {/* Qualification */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 inline-block whitespace-nowrap">
                            {cand.qualification || "Unspecified"}
                          </span>
                          {cand.college_name && (
                            <div className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]" title={cand.college_name}>
                              🎓 {cand.college_name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Data Scope Window */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {renderScopeBadge(cand.data_scope_hours)}
                      </td>

                      {/* Daily Quota / Limit Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {renderQuotaBadge(cand)}
                      </td>

                      {/* Access Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isStopped ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            <span>Stopped</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      {/* Applications */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-700 text-xs">
                          {cand.total_applications} Applied
                        </span>
                      </td>

                      {/* Action Buttons: Stop Access & Edit User */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* STOP / RESUME ACCESS BUTTON */}
                          <button
                            type="button"
                            disabled={isAdminUser}
                            onClick={() => handleToggleUserAccess(cand)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 border whitespace-nowrap ${
                              isAdminUser
                                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                                : isStopped
                                ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 shadow-2xs cursor-pointer"
                                : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800 shadow-2xs cursor-pointer"
                            }`}
                            title={
                              isAdminUser
                                ? "Administrator access cannot be stopped"
                                : isStopped
                                ? "Resume user login access"
                                : "Stop user access immediately"
                            }
                          >
                            {isStopped ? (
                              <>
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                <span>Resume</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3 text-rose-600" />
                                <span>Stop Access</span>
                              </>
                            )}
                          </button>

                          {/* EDIT USER BUTTON */}
                          <button
                            type="button"
                            onClick={() => openEditModal(cand)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
                            title="Edit candidate profile & access limits"
                          >
                            <Edit3 className="w-3 h-3 text-slate-500" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: STORAGE & LIVE CACHE MAINTENANCE                               */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            Storage &amp; Live Catalog Cache
          </h3>
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              isCloudSupabase
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}
          >
            {isCloudSupabase ? "Supabase Cloud" : "Local SQLite"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-900 block">Current Catalog Volume</span>
            <span className="text-indigo-600 font-black text-lg">{totalJobs.toLocaleString()} Open Roles</span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Purge in-memory cached listings to force re-indexing from storage.
            </p>
          </div>

          <button
            onClick={handleFlushCache}
            disabled={isFlushing}
            className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isFlushing ? "animate-spin" : ""}`} />
            <span>{isFlushing ? "Flushing..." : "Purge & Reload Cache"}</span>
          </button>
        </div>

        {flushMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{flushMessage}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* EDIT USER ACCESS & PROFILE MODAL                                          */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-hidden min-h-0">
            {/* Header - Fixed at Top */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Candidate Access &amp; Profile
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    @{editingUser.username}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditUser} className="flex-1 min-h-0 flex flex-col overflow-hidden text-xs">
              <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
              {/* Access Status Switch */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <label className="font-bold text-slate-900 block">Candidate Access Status</label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Stopping access immediately prevents candidate login and invalidates active sessions.
                  </p>
                </div>
                <select
                  value={editingUser.status}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, status: e.target.value as "Active" | "Stopped" })
                  }
                  className={`font-bold px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                    editingUser.status === "Stopped"
                      ? "bg-rose-50 border-rose-300 text-rose-800"
                      : "bg-emerald-50 border-emerald-300 text-emerald-800"
                  }`}
                >
                  <option value="Active">Active (Allowed)</option>
                  <option value="Stopped">Stopped (Blocked)</option>
                </select>
              </div>

              {/* Candidate Data Visibility Window (Hours) */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <label className="font-bold text-slate-900 block text-xs">
                        Data Visibility Window (Hours)
                      </label>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Controls how far back in hours this candidate can view job openings.
                      </p>
                    </div>
                  </div>

                  <select
                    value={editScopePreset}
                    onChange={(e) => setEditScopePreset(e.target.value)}
                    className="bg-white border border-indigo-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="all">All Live Data (Full Catalog)</option>
                    <option value="24">Last 24 Hours (1 Day)</option>
                    <option value="48">Last 48 Hours (2 Days)</option>
                    <option value="72">Last 72 Hours (3 Days)</option>
                    <option value="custom">Custom Hours...</option>
                  </select>
                </div>

                {editScopePreset === "custom" && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-200 animate-in fade-in">
                    <span className="text-[11px] font-bold text-slate-700">Enter Hours:</span>
                    <input
                      type="number"
                      min="1"
                      max="8760"
                      value={editCustomHours}
                      onChange={(e) => setEditCustomHours(e.target.value)}
                      placeholder="e.g. 24, 48, 72"
                      className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    <span className="text-[11px] text-slate-500 font-medium">
                      hours (e.g. 24 = 1 day, 48 = 2 days, 72 = 3 days)
                    </span>
                  </div>
                )}

                <div className="text-[11px] text-indigo-900/90 bg-white/80 p-2 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Effective Scope: <strong>{editScopePreset === "custom" ? `${editCustomHours || 24} Hours Window` : editScopePreset === "all" ? "All Jobs (Full Catalog)" : `Last ${editScopePreset} Hours Window`}</strong>. Updating takes effect immediately on candidate&apos;s next search.
                  </span>
                </div>
              </div>

              {/* Candidate Daily Application Quota */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <label className="font-bold text-slate-900 block text-xs">
                        Daily Application Limit (Quota)
                      </label>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Lock verified jobs if candidate exceeds this number of applications per day.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={editDailyLimit}
                      onChange={(e) => setEditDailyLimit(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 text-center"
                    />
                    <span className="text-xs font-bold text-slate-600">jobs/day</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
                  {[5, 10, 15, 20, 25, 50, 0].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditDailyLimit(preset)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer border ${
                        editDailyLimit === preset
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset === 0 ? "Unlimited" : `${preset}/day`}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    When set to <strong>{editDailyLimit > 0 ? `${editDailyLimit} jobs/day` : "Unlimited"}</strong>, candidate will be locked on their {editDailyLimit > 0 ? `${editDailyLimit + 1}th` : "N/A"} application attempt that day until midnight.
                  </span>
                </div>
              </div>

              {/* Full Name & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.full_name}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Phone & Qualification */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={editingUser.mobile_number || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, mobile_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Qualification</label>
                  <input
                    type="text"
                    value={editingUser.qualification || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, qualification: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* College / Institution Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">College / Institution Name</label>
                <input
                  type="text"
                  placeholder="e.g. PSG College of Technology, Anna University..."
                  value={editingUser.college_name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, college_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Address */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Address / Location</label>
                <input
                  type="text"
                  value={editingUser.address || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Modal Actions - Pinned at Bottom */}
            <div className="p-4 px-5 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Updates take effect immediately on next query.
              </span>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>
      )}
    </div>
  );
}
