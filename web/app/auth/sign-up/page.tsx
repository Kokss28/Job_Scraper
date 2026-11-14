import { Suspense } from "react";
import { PortalRegisterForm } from "@/components/portal-register-form";

export const metadata = {
  title: "Create Account | Job Portal",
  description: "Register for your verified candidate account with an admin invitation code",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 flex items-center justify-center p-4 sm:p-6">
      <Suspense fallback={<div className="text-xs font-semibold text-slate-500">Loading registration...</div>}>
        <PortalRegisterForm />
      </Suspense>
    </div>
  );
}
