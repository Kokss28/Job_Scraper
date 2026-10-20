import { ForgotPasswordForm } from "@/components/forgot-password-form";
import Link from "next/link";

export default function Page() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand">Job Intelligence</Link>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
