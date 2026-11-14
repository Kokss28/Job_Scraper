"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  KeyRound,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  GraduationCap,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  Check,
} from "lucide-react";

export function PortalRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");

  // Wizard Step: 1 = Admin Code Verification, 2 = User Registration Form
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Admin Code
  const [adminCode, setAdminCode] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isAutoVerifying, setIsAutoVerifying] = useState(false);
  const [codeSuccessMsg, setCodeSuccessMsg] = useState<string | null>(null);

  // Auto-fill and auto-verify if code is present in query parameters (?code=ADM-2026-XXXX)
  useEffect(() => {
    if (codeParam && step === 1) {
      const clean = codeParam.trim().toUpperCase();
      setAdminCode(clean);
      setIsAutoVerifying(true);
      setError(null);

      fetch("/api/portal/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCodeSuccessMsg(`Invite link recognized (${clean})! Complete your profile below.`);
            setStep(2);
          } else {
            setError(data.error || "The invite link contains an invalid or already used Admin Code.");
          }
        })
        .catch(() => {
          setError("Failed to verify invite code from link.");
        })
        .finally(() => {
          setIsAutoVerifying(false);
        });
    }
  }, [codeParam]);

  // Step 2: Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [address, setAddress] = useState("");
  const [qualification, setQualification] = useState("B.Tech / B.E. Computer Science");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Step 1 Handler: Verify Admin Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCodeSuccessMsg(null);

    const cleanCode = adminCode.trim().toUpperCase();
    if (!cleanCode) {
      setError("Please enter the unique Admin Code provided by your administrator.");
      return;
    }

    setIsVerifyingCode(true);

    try {
      const res = await fetch("/api/portal/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid Admin Code. Please check or request a new code.");
      }

      setCodeSuccessMsg("Admin Code verified! Proceeding to registration...");
      setTimeout(() => {
        setStep(2);
        setError(null);
      }, 500);
    } catch (err: any) {
      setError(err?.message || "Failed to verify Admin Code.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Step 2 Handler: Submit User Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validations
    if (!fullName.trim()) {
      setError("Full Name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("A valid Email Address is required.");
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }
    if (!qualification.trim()) {
      setError("Educational qualification is required.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/portal/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminCode: adminCode.trim().toUpperCase(),
          fullName: fullName.trim(),
          email: email.trim(),
          mobileNumber: mobileNumber.trim(),
          username: username.trim(),
          password,
          confirmPassword,
          address: address.trim(),
          qualification: qualification.trim(),
          dateOfBirth,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed. Please check form details.");
      }

      setSuccess("Account Created Successfully! Welcome to your User Dashboard...");
      setTimeout(() => {
        router.push(data.redirectUrl || "/portal");
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-3">
          <Briefcase className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Create Candidate Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          {step === 1 ? "Step 1 of 2: Admin Access Verification" : "Step 2 of 2: Candidate Profile Details"}
        </p>

        {/* Progress Bar indicator */}
        <div className="flex items-center justify-center gap-2 mt-4 max-w-xs mx-auto">
          <div
            className={`h-1.5 flex-1 rounded-full transition-all ${
              step >= 1 ? "bg-indigo-600" : "bg-slate-200"
            }`}
          />
          <div
            className={`h-1.5 flex-1 rounded-full transition-all ${
              step === 2 ? "bg-indigo-600" : "bg-slate-200"
            }`}
          />
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {step === 1 ? "Verify Admin Code" : "Candidate Registration Form"}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {step === 1
                ? "Enter your unique single-use code to unlock registration"
                : "Complete all fields to finalize your verified profile"}
            </p>
          </div>
          <Link
            href="/login"
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {codeSuccessMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>{codeSuccessMsg}</div>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-3 animate-in fade-in shadow-xs">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-emerald-900">Account Created Successfully!</div>
              <div className="text-[11px] text-emerald-700 font-normal">Redirecting to Login Page now...</div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 1: ADMIN CODE VERIFICATION FORM                     */}
        {/* ========================================================= */}
        {step === 1 && (
          isAutoVerifying ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-9 h-9 mx-auto rounded-full border-2 border-indigo-600/30 border-t-indigo-600 animate-spin" />
              <div className="text-sm font-bold text-slate-800">Verifying Invite Link...</div>
              <p className="text-xs text-slate-500 font-medium">
                Validating Admin Code <span className="font-mono font-bold text-indigo-600">{adminCode}</span> with system
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Admin Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                </div>
                <input
                  type="text"
                  autoFocus
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ADM-2026-7890"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 text-xs font-mono font-bold text-slate-900 tracking-wider placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal transition-all outline-hidden uppercase"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Each code is single-use and granted directly by system administrators.
              </p>
            </div>

            {/* Quick Demo Pre-filled Codes Pill */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <span className="font-bold text-slate-700 block">Available Admin Codes for Registration:</span>
              <div className="flex flex-wrap gap-1.5">
                {["ADM-2026-7890", "ADM-2026-4321", "ADM-2026-9901", "TALENT-2026-VIP"].map((demoCode) => (
                  <button
                    key={demoCode}
                    type="button"
                    onClick={() => setAdminCode(demoCode)}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-indigo-700 font-mono font-bold text-[10px] hover:bg-indigo-50 hover:border-indigo-300 transition-colors cursor-pointer"
                  >
                    {demoCode}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifyingCode}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isVerifyingCode ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Code &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) )}

        {/* ========================================================= */}
        {/* STEP 2: USER REGISTRATION FORM                           */}
        {/* ========================================================= */}
        {step === 2 && !success && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Verified Code Pill */}
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Verified Admin Code: <span className="font-mono">{adminCode}</span>
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] text-emerald-700 underline font-semibold hover:text-emerald-900"
              >
                Change Code
              </button>
            </div>

            {/* Row 1: Full Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kokila Murugesan"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-medium text-slate-900 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Username *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="e.g. kokila28"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-mono font-medium text-slate-900 outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Email & Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-medium text-slate-900 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-medium text-slate-900 outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-medium text-slate-900 outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-medium text-slate-900 outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Row 4: Educational Qualification & Date of Birth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Qualification *
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-medium text-slate-900 outline-hidden transition-all cursor-pointer"
                  >
                    <option value="B.Tech / B.E. Computer Science">B.Tech / B.E. Computer Science</option>
                    <option value="B.Tech / B.E. Information Technology">B.Tech / B.E. Information Technology</option>
                    <option value="B.Tech / B.E. (Any Stream)">B.Tech / B.E. (Any Stream)</option>
                    <option value="BCA (Bachelor of Computer Applications)">BCA (Bachelor of Computer Applications)</option>
                    <option value="B.Sc. Computer Science / IT">B.Sc. Computer Science / IT</option>
                    <option value="MCA (Master of Computer Applications)">MCA (Master of Computer Applications)</option>
                    <option value="M.Sc. Computer Science / IT / Data">M.Sc. Computer Science / IT / Data</option>
                    <option value="M.Tech / M.E.">M.Tech / M.E.</option>
                    <option value="Any Graduate / Diploma">Any Graduate / Diploma</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-medium text-slate-900 outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Current Location / Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Chennai, Tamil Nadu, India"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-600 text-xs font-medium text-slate-900 outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account &amp; Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
