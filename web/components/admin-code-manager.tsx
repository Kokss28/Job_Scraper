"use client";

import { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  Share2,
  ExternalLink,
  Users,
  Mail,
  Phone,
  GraduationCap,
  MapPin,
  Calendar,
  X,
  Briefcase
} from "lucide-react";

type AdminCodeItem = {
  code_id: string;
  unique_admin_code: string;
  status: "Unused" | "Used" | "Expired";
  created_date: string;
  used_by_user_id: string | null;
  used_by_name: string | null;
  used_by_username: string | null;
};

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

export function AdminCodeManager() {
  const [activeTab, setActiveTab] = useState<"codes" | "candidates">("codes");
  const [codes, setCodes] = useState<AdminCodeItem[]>([]);
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateUser | null>(null);

  const [totalCount, setTotalCount] = useState(0);
  const [unusedCount, setUnusedCount] = useState(0);
  const [usedCount, setUsedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [newlyGenerated, setNewlyGenerated] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/portal/admin-codes");
      const data = await res.json();
      if (data.success) {
        setCodes(data.codes || []);
        setTotalCount(data.totalCount || 0);
        setUnusedCount(data.unusedCount || 0);
        setUsedCount(data.usedCount || 0);
      }
    } catch (e) {
      console.error("Error loading admin codes:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/users");
      const data = await res.json();
      if (data.success) {
        setCandidates(data.users || []);
      }
    } catch (e) {
      console.error("Error loading candidates:", e);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
    fetchCandidates();
  }, [fetchCodes, fetchCandidates]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setNewlyGenerated(null);
    try {
      const res = await fetch("/api/portal/admin-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: "ADM-2026" }),
      });
      const data = await res.json();
      if (data.success) {
        setNewlyGenerated(data.code);
        fetchCodes();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyShareLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/register?code=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleViewCandidateByCode = (item: AdminCodeItem) => {
    if (!item.used_by_user_id) return;
    const found = candidates.find((c) => c.user_id === item.used_by_user_id);
    if (found) {
      setSelectedCandidate(found);
    } else {
      // Create minimal preview
      setSelectedCandidate({
        user_id: item.used_by_user_id,
        full_name: item.used_by_name || "Registered Candidate",
        username: item.used_by_username || "candidate",
        email: "Registered Account",
        mobile_number: null,
        address: null,
        qualification: null,
        date_of_birth: null,
        created_date: item.created_date,
        status: "Active",
        used_admin_code: item.unique_admin_code,
        total_applications: 0,
      });
    }
  };

  const handleToggleUserAccess = async (user: CandidateUser) => {
    const nextStatus = user.status === "Stopped" ? "Active" : "Stopped";
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
      if (data.success) {
        setCandidates(data.users || []);
        if (selectedCandidate && selectedCandidate.user_id === user.user_id) {
          setSelectedCandidate({ ...selectedCandidate, status: nextStatus });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 md:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              Candidate Access &amp; Invite Code Governance
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Generate single-use invite codes with shareable links, and monitor live registered candidate accounts.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              fetchCodes();
              fetchCandidates();
            }}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Generate New Code</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-4 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/50 text-center">
        <div className="p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Codes
          </span>
          <span className="text-lg font-black text-slate-900 mt-0.5 block">{totalCount}</span>
        </div>
        <div className="p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Available (Unused)
          </span>
          <span className="text-lg font-black text-emerald-600 mt-0.5 block">{unusedCount}</span>
        </div>
        <div className="p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Used by Candidates
          </span>
          <span className="text-lg font-black text-slate-700 mt-0.5 block">{usedCount}</span>
        </div>
        <div className="p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
            Registered Candidates
          </span>
          <span className="text-lg font-black text-indigo-600 mt-0.5 block">{candidates.length}</span>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setActiveTab("codes")}
          className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === "codes"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Invitation Codes ({codes.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("candidates")}
          className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === "candidates"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Registered Candidates Directory ({candidates.length})
          </span>
        </button>
      </div>

      {/* Newly Generated Banner Alert */}
      {newlyGenerated && (
        <div className="p-4 mx-6 my-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold">
                New Code Issued:{" "}
                <strong className="font-mono text-sm font-black text-emerald-950">{newlyGenerated}</strong>
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Single-use invite link ready. Candidate code will be automatically filled &amp; verified.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyShareLink(newlyGenerated)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {copiedLink === newlyGenerated ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink === newlyGenerated ? "Link Copied!" : "Copy Share Link"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopyCode(newlyGenerated)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedCode === newlyGenerated ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode === newlyGenerated ? "Code Copied" : "Copy Code"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: CODES TABLE */}
      {activeTab === "codes" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Admin Code</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Candidate Registration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading && codes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading Admin Codes...</span>
                  </td>
                </tr>
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No Admin Codes found. Click &quot;Generate New Code&quot; to issue your first code.
                  </td>
                </tr>
              ) : (
                codes.map((item) => {
                  const isUnused = item.status === "Unused";

                  return (
                    <tr key={item.code_id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Code */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {item.unique_admin_code}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isUnused ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Unused (Valid)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                            <span>Used</span>
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(item.created_date).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Used By */}
                      <td className="py-3 px-4">
                        {item.used_by_name ? (
                          <button
                            type="button"
                            onClick={() => handleViewCandidateByCode(item)}
                            className="flex items-center gap-1.5 text-left group cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
                            <div>
                              <div className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                                <span>{item.used_by_name}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">@{item.used_by_username}</div>
                            </div>
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Ready to share</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {isUnused ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyShareLink(item.unique_admin_code)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Copy shareable registration link"
                              >
                                {copiedLink === item.unique_admin_code ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-700">Link Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3 h-3 text-indigo-600" />
                                    <span>Share Link</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyCode(item.unique_admin_code)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Copy raw code"
                              >
                                {copiedCode === item.unique_admin_code ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-500" />
                                )}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewCandidateByCode(item)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-indigo-600 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>View Candidate Info</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: REGISTERED CANDIDATES DIRECTORY */}
      {activeTab === "candidates" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Candidate Profile</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Qualification</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4">Admin Code Used</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-center">Applications</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No candidates have registered yet.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Generate an invite code and share the link to onboard candidates live.
                    </p>
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => (
                  <tr key={cand.user_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Candidate Name & Username */}
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{cand.full_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">@{cand.username}</div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        <div className="text-slate-700 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{cand.email}</span>
                        </div>
                        {cand.mobile_number && (
                          <div className="text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{cand.mobile_number}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Qualification */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        <GraduationCap className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate max-w-[150px]">{cand.qualification || "Not specified"}</span>
                      </span>
                    </td>

                    {/* Access Status */}
                    <td className="py-3 px-4">
                      {cand.status === "Stopped" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          <span>STOPPED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Admin Code Used */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {cand.used_admin_code || "Open Sign-up"}
                      </span>
                    </td>

                    {/* Registered Date */}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(cand.created_date).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Applications */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                        {cand.total_applications} Applied
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleToggleUserAccess(cand)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                            cand.status === "Stopped"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                          }`}
                        >
                          {cand.status === "Stopped" ? "Resume" : "Stop Access"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCandidate(cand)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          View Info
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CANDIDATE FULL DETAILS MODAL */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-600/30">
                  {selectedCandidate.full_name?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedCandidate.full_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    @{selectedCandidate.username}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Email Address
                </span>
                <span className="font-bold text-slate-800 break-all">{selectedCandidate.email}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Mobile Number
                </span>
                <span className="font-bold text-slate-800">{selectedCandidate.mobile_number || "Not provided"}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Qualification
                </span>
                <span className="font-bold text-slate-800">{selectedCandidate.qualification || "Not provided"}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Date of Birth
                </span>
                <span className="font-bold text-slate-800">{selectedCandidate.date_of_birth || "Not specified"}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Residential Address
                </span>
                <span className="font-medium text-slate-800">{selectedCandidate.address || "Not provided"}</span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700 block mb-0.5">
                  Admin Code Redeemed
                </span>
                <span className="font-mono font-black text-indigo-950 text-xs">
                  {selectedCandidate.used_admin_code || "None (Open Sign-up)"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-0.5">
                  Jobs Applied
                </span>
                <span className="font-black text-emerald-950 text-xs">
                  {selectedCandidate.total_applications} Applications Logged
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleUserAccess(selectedCandidate)}
                className={`px-3 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  selectedCandidate.status === "Stopped"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {selectedCandidate.status === "Stopped" ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Resume Candidate Access</span>
                  </>
                ) : (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    <span>Stop Candidate Access</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
