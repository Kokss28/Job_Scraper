import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BriefcaseBusiness, Building2, MapPin, Search } from "lucide-react";

import { JobSaveButton } from "@/components/job-save-button";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ q?: string; source?: string; page?: string }>;
type Job = {
  job_id: string;
  title: string;
  company: string | null;
  source: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  min_experience_years: string | null;
  max_experience_years: string | null;
  skills: string | null;
  degree_required: string | null;
  collected_at: string | null;
  link: string | null;
};

const PAGE_SIZE = 20;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const source = params.source?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/login");

  const [{ data: profile }, { data: jobsData, count, error }, { data: roleData }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", auth.user.id).maybeSingle(),
    (async () => {
      let request = supabase.from("jobs").select("*", { count: "exact" });
      if (query) request = request.ilike("title", `%${query}%`);
      if (source) request = request.eq("source", source);
      return request.order("collected_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    })(),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle(),
  ]);

  if (error?.code === "PGRST205" || error?.code === "42P01") {
    return <SetupNotice message="The Supabase jobs table is not set up yet. Apply the included migration, then import your CSV." />;
  }
  if (error) return <SetupNotice message={`Could not load jobs: ${error.message}`} />;

  const jobs = (jobsData ?? []) as Job[];
  const { data: sourceRows } = await supabase.from("jobs").select("source");
  const sourceCounts = new Map<string, number>();
  for (const row of sourceRows ?? []) {
    const key = row.source || "Other";
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  const sources = [...sourceCounts.keys()].sort();
  const companies = new Set(jobs.map((job) => job.company).filter(Boolean));
  const topSource = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand"><span className="brand-mark">J</span><span>Job Intelligence</span></Link>
        <div className="nav-label">Workspace</div>
        <Link className="nav-item active" href="/dashboard"><BriefcaseBusiness size={17} /> Job overview</Link>
        <Link className="nav-item" href="/saved-jobs"><Building2 size={17} /> Saved jobs</Link>
        {roleData?.role === "admin" && <><div className="nav-label section-gap">Administration</div><Link className="nav-item" href="/admin"><Building2 size={17} /> Admin console</Link></>}
        <div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{(profile?.display_name || auth.user.email || "U").slice(0, 1).toUpperCase()}</div><div className="user-copy"><strong>{profile?.display_name || "Your workspace"}</strong><span>{auth.user.email}</span></div></div><LogoutButton /></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div><p className="eyebrow">Workspace / Overview</p><h1>Job market overview</h1></div><div className="topbar-actions"><span className="live-pill"><i /> Live database</span><span className="date-chip">Updated from Supabase</span></div></header>
        <div className="content-wrap">
          <section className="welcome-row"><div><h2>Find your next opportunity</h2><p>Explore jobs from LinkedIn, Naukri, and Indeed in one place.</p></div><span className="welcome-icon"><BriefcaseBusiness size={22} /></span></section>

          <section className="metric-grid">
            <Metric label="Matching jobs" value={(count ?? 0).toLocaleString()} note="Based on current filters" icon={<BriefcaseBusiness size={18} />} />
            <Metric label="Companies on this page" value={companies.size.toString()} note="Unique employers" icon={<Building2 size={18} />} />
            <Metric label="Top source" value={topSource} note={`${sourceCounts.get(topSource) ?? 0} jobs in catalog`} icon={<Search size={18} />} />
            <Metric label="Sources" value={sourceCounts.size.toString()} note="Connected job boards" icon={<MapPin size={18} />} />
          </section>

          <section className="panel source-panel"><div className="section-heading"><div><h3>Jobs by source</h3><p>Distribution across connected job boards</p></div><span className="section-tag">All catalog</span></div><div className="source-bars">{[...sourceCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([name, value]) => <div className="source-bar-row" key={name}><div className="source-bar-label"><span>{name}</span><strong>{value}</strong></div><div className="bar-track"><span style={{ width: `${Math.max(4, (value / Math.max(1, Math.max(...sourceCounts.values()))) * 100)}%` }} /></div></div>)}</div></section>

          <section className="panel jobs-panel">
            <div className="section-heading"><div><h3>Recent jobs</h3><p>Browse, filter, and save opportunities</p></div><span className="section-tag">{(count ?? 0).toLocaleString()} results</span></div>
            <form className="filter-form" action="/dashboard"><label className="search-box"><Search size={17} /><input name="q" defaultValue={query} placeholder="Search job titles" /></label><select name="source" defaultValue={source}><option value="">All sources</option>{sources.map((item) => <option key={item} value={item}>{item}</option>)}</select><button className="button button-primary" type="submit">Apply filters</button></form>
            {jobs.length === 0 ? <div className="empty-state"><BriefcaseBusiness size={28} /><strong>No jobs found</strong><span>Try a different title or source filter.</span></div> : <div className="job-list">{jobs.map((job) => <article className="job-card" key={job.job_id}><div className="job-card-main"><div className="job-source">{job.source || "Job listing"}<span>·</span>{formatDate(job.collected_at)}</div><h4>{job.title}</h4><div className="job-meta"><span><Building2 size={14} />{job.company || "Company not specified"}</span><span><MapPin size={14} />{[job.city, job.state].filter((part) => part && part !== "Not Specified").join(", ") || "Location not specified"}</span><span>{formatExperience(job.min_experience_years, job.max_experience_years)}</span></div><div className="skill-list">{(job.skills || "").split(",").filter((skill) => skill.trim() && skill.trim() !== "Not Specified").slice(0, 5).map((skill) => <span className="skill-tag" key={skill}>{skill.trim()}</span>)}</div></div><div className="job-card-actions"><JobSaveButton userId={auth.user.id} jobId={job.job_id} /><a className="icon-link" href={job.link || "#"} target="_blank" rel="noreferrer" aria-label="Open job listing"><ArrowUpRight size={18} /></a></div></article>)}</div>}
            <div className="pagination"><span>Page {page} of {totalPages}</span><div><PageLink page={Math.max(1,page-1)} query={query} source={source} disabled={page<=1}>Previous</PageLink><PageLink page={Math.min(totalPages,page+1)} query={query} source={source} disabled={page>=totalPages}>Next</PageLink></div></div>
          </section>
          <footer className="footer-note">Job Intelligence Dashboard <span>·</span> Personal saved jobs are private to your account</footer>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{note}</small></article>;
}

function SetupNotice({ message }: { message: string }) {
  return <main className="setup-page"><section className="setup-card"><p className="eyebrow">Setup required</p><h1>Dashboard is not connected</h1><p>{message}</p><Link className="button button-primary" href="/">Return home</Link></section></main>;
}

function PageLink({ page, query, source, disabled, children }: { page: number; query: string; source: string; disabled: boolean; children: React.ReactNode }) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (source) params.set("source", source);
  return disabled ? <span className="page-link disabled">{children}</span> : <Link className="page-link" href={`/dashboard?${params.toString()}`}>{children}</Link>;
}

function formatExperience(min?: string | null, max?: string | null) {
  const lower = min && min !== "Not Specified" ? min : null;
  const upper = max && max !== "Not Specified" ? max : null;
  if (lower && upper) return `${lower}–${upper} years`;
  if (lower) return `${lower}+ years`;
  return "Experience not specified";
}

function formatDate(value?: string | null) {
  if (!value) return "Recently collected";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently collected" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
