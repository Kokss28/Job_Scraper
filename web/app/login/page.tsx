import { PortalLoginForm } from "@/components/portal-login-form";

export const metadata = {
  title: "Candidate Login | Job Portal",
  description: "Sign in to access verified job postings and track your applications",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 flex items-center justify-center p-4 sm:p-6">
      <PortalLoginForm />
    </div>
  );
}
