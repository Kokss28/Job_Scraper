"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings,
  ShieldCheck,
  Lock,
  Unlock,
  Globe,
  Sliders,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  User,
  UserCheck,
  UserX,
  Edit3,
  FileCheck,
  KeyRound,
  Layers,
  Save,
  Check,
  Sparkles,
  Server,
  Clock,
  MapPin,
  FileText,
  Share2,
  Copy,
  X,
  ShieldAlert
} from "lucide-react";

type CandidateUser = {
  user_id: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  username: string;
  address: string | null;
  qualification: string | null;
  date_of_birth: string | null;
  created_date: string;
  status: "Active" | "Stopped";
  used_admin_code: string | null;
  total_applications: number;
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
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Cache flush state
  const [isFlushing, setIsFlushing] = useState(false);
  const [flushMessage, setFlushMessage] = useState<string | null>(null);

  // Invite code & share link generator
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [latestInviteCode, setLatestInviteCode] = useState<string | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  // Candidate Users Management
  const [users, setUsers] = useState<CandidateUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userActionMsg, setUserActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingUser, setEditingUser] = useState<CandidateUser | null>(null);
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

  const handleToggleSetting = (key: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));
  };

  const handleChangeSetting = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/portal/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings");
      }
      setSettings(data.settings);
      if (data.metrics) setMetrics(data.metrics);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    try {
      const res = await fetch("/api/portal/admin-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: "ADM-2026" }),
      });
      const data = await res.json();
      if (data.success) {
        setLatestInviteCode(data.code);
        setMetrics((prev) => ({
          ...prev,
          totalCodes: prev.totalCodes + 1,
          unusedCodes: prev.unusedCodes + 1,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/register?code=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 2500);
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

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingEdit(true);

    try {
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
            address: editingUser.address,
            status: editingUser.status,
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
        text: `Candidate profile for ${editingUser.full_name} updated successfully.`,
      });
      setTimeout(() => setUserActionMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to save changes");
    } finally {
      setIsSavingEdit(false);
    }
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
            Quickly toggle registration mode, generate share links, and manage candidate accounts live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              Settings Saved
            </span>
          )}
          {saveError && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5" />
              {saveError}
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: SIMPLIFIED CANDIDATE ACCESS POLICY & INVITE GENERATOR         */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              Candidate Access Policy (Simplified)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Control how new users register and instantly generate one-click invitation links.
            </p>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
            {settings.require_admin_code === "true" ? "Invite-Only Active" : "Public Sign-Up Active"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Simple 2-Option Registration Mode Toggle */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 block">
              Registration Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChangeSetting("require_admin_code", "true")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.require_admin_code === "true"
                    ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold">Invite-Only Mode</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Requires admin code to create an account.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleChangeSetting("require_admin_code", "false")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.require_admin_code === "false"
                    ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold">Open Public Mode</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Anyone can sign up without an admin code.
                </p>
              </button>
            </div>

            {/* Quick Session duration inline */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
              <span className="text-slate-600 font-medium">Session Duration:</span>
              <select
                value={settings.session_duration_days || "7"}
                onChange={(e) => handleChangeSetting("session_duration_days", e.target.value)}
                className="text-xs font-bold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
              >
                <option value="3">3 Days Timeout</option>
                <option value="7">7 Days (Standard)</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>
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
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isGeneratingInvite ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Generate Link</span>
              </button>
            </div>

            {latestInviteCode ? (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-indigo-950">
                    Code: {latestInviteCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyInviteLink(latestInviteCode)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedInviteLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedInviteLink ? "Copied!" : "Copy Share Link"}</span>
                  </button>
                </div>
                <div className="font-mono text-[10px] text-indigo-800 bg-white p-2 rounded-lg border border-indigo-200/80 truncate select-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/register?code=${latestInviteCode}`
                    : `/register?code=${latestInviteCode}`}
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Candidate Profile</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Qualification</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4 text-center">Applications</th>
                <th className="py-3 px-4 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoadingUsers && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading candidate accounts...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No candidates registered yet. Share an invite link to onboard users.
                  </td>
                </tr>
              ) : (
                users.map((cand) => {
                  const isStopped = cand.status === "Stopped";

                  return (
                    <tr
                      key={cand.user_id}
                      className={`transition-colors ${
                        isStopped ? "bg-rose-50/30 hover:bg-rose-50/50" : "hover:bg-slate-50/60"
                      }`}
                    >
                      {/* Name & Username */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isStopped
                                ? "bg-rose-100 text-rose-700"
                                : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {cand.full_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{cand.full_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">@{cand.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="text-[11px] space-y-0.5">
                          <div className="text-slate-700">{cand.email}</div>
                          <div className="text-slate-500">{cand.mobile_number || "No phone"}</div>
                        </div>
                      </td>

                      {/* Qualification */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {cand.qualification || "Unspecified"}
                        </span>
                      </td>

                      {/* Access Status Badge */}
                      <td className="py-3 px-4">
                        {isStopped ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            <span>ACCESS STOPPED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active Access</span>
                          </span>
                        )}
                      </td>

                      {/* Applications */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-700 text-xs">
                          {cand.total_applications} Applied
                        </span>
                      </td>

                      {/* Action Buttons: Stop Access & Edit User */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* STOP / RESUME ACCESS BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleToggleUserAccess(cand)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer border ${
                              isStopped
                                ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 shadow-2xs"
                                : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800 shadow-2xs"
                            }`}
                            title={isStopped ? "Resume user login access" : "Stop user access immediately"}
                          >
                            {isStopped ? (
                              <>
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                <span>Resume Access</span>
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
                            onClick={() => setEditingUser(cand)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Edit user details"
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
      {/* SECTION 3: SCRAPER DEFAULTS & STORAGE MAINTENANCE                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Scraper Defaults */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              Scraper Execution Defaults
            </h3>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              JobSpy Core
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Target Location</label>
              <select
                value={settings.default_location || "India"}
                onChange={(e) => handleChangeSetting("default_location", e.target.value)}
                className="w-full font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              >
                <option value="India">Pan-India</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Chennai">Chennai</option>
                <option value="Delhi NCR">Delhi NCR</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Freshness Window</label>
              <select
                value={settings.default_freshness_hours || "72"}
                onChange={(e) => handleChangeSetting("default_freshness_hours", e.target.value)}
                className="w-full font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              >
                <option value="24">24 Hours</option>
                <option value="72">3 Days (72h)</option>
                <option value="168">7 Days</option>
                <option value="336">14 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Storage & Cache */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Storage &amp; Live Cache
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

          <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 block">Catalog Volume</span>
              <span className="text-indigo-600 font-black text-sm">{totalJobs.toLocaleString()} Open Roles</span>
            </div>
            <button
              onClick={handleFlushCache}
              disabled={isFlushing}
              className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isFlushing ? "animate-spin" : ""}`} />
              <span>{isFlushing ? "Flushing..." : "Flush Cache"}</span>
            </button>
          </div>

          {flushMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{flushMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EDIT USER ACCESS & PROFILE MODAL                                          */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
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
            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
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

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? "Saving..." : "Save User Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
