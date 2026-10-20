import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark">J</span>Job Intelligence</div><p className="eyebrow">Create account</p><h1>Set up your workspace</h1><p className="auth-subtitle">New accounts receive the standard user role.</p><SignUpForm /></section></main>
  );
}
