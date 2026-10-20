import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark">J</span>Job Intelligence</div><p className="eyebrow">Welcome back</p><h1>Sign in to your dashboard</h1><p className="auth-subtitle">Continue to your jobs and saved opportunities.</p><LoginForm /></section></main>
  );
}
