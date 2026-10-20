import { UpdatePasswordForm } from "@/components/update-password-form";
import Link from "next/link";

export default function Page() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand">Job Intelligence</Link>
        <UpdatePasswordForm />
      </section>
    </main>
  );
}
