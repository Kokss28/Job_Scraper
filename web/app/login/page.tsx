import { Suspense } from "react";
import { PortalLoginForm } from "@/components/portal-login-form";

export const metadata = {
  title: "Sign In | TalentPulse Intelligence Portal",
  description: "Unified authentication portal for Candidates and System Administrators",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 flex items-center justify-center p-4 sm:p-6">
      <Suspense fallback={<div className="text-xs font-semibold text-slate-500">Loading sign in...</div>}>
        <PortalLoginForm />
      </Suspense>
    </div>
  );
}
