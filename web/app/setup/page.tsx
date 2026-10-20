export default function SetupPage() {
  return (
    <main className="setup-page">
      <section className="setup-card">
        <p className="eyebrow">Job Intelligence</p>
        <h1>Connect your Supabase project</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code>, add your
          Supabase project URL and publishable key, then run the SQL migration
          in <code>supabase/migrations</code>.
        </p>
        <p className="muted">
          Import <code>../Data/unified_jobs.csv</code> into the Supabase
          <code> jobs</code> table after the migration is applied.
        </p>
      </section>
    </main>
  );
}
