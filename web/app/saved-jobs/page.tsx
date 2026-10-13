import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bookmark, BriefcaseBusiness, Building2, MapPin } from "lucide-react";

import { JobSaveButton } from "@/components/job-save-button";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

type SavedRecord = { job_id: string; status: string; jobs: { title: string; company: string | null; city: string | null; state: string | null; source: string | null; link: string | null } | null };

export default async function SavedJobsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/login");
  const [{ data: profile }, { data, error }, { data: roleData }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", auth.user.id).maybeSingle(),
    supabase.from("saved_jobs").select("job_id,status,jobs(title,company,city,state,source,link)").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle(),
  ]);
  const records = (data ?? []) as unknown as SavedRecord[];

  return <main className="app-shell"><aside className="sidebar"><Link href="/dashboard" className="brand"><span className="brand-mark">J</span><span>Job Intelligence</span></Link><div className="nav-label">Workspace</div><Link className="nav-item" href="/dashboard"><BriefcaseBusiness size={17} /> Job overview</Link><Link className="nav-item active" href="/saved-jobs"><Bookmark size={17} /> Saved jobs</Link>{roleData?.role === "admin" && <><div className="nav-label section-gap">Administration</div><Link className="nav-item" href="/admin"><Building2 size={17} /> Admin console</Link></>}<div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{(profile?.display_name || auth.user.email || "U").slice(0,1).toUpperCase()}</div><div className="user-copy"><strong>{profile?.display_name || "Your workspace"}</strong><span>{auth.user.email}</span></div></div><LogoutButton /></div></aside><section className="main-panel"><header className="topbar"><div><p className="eyebrow">Workspace / Saved jobs</p><h1>Your saved jobs</h1></div><Link className="button button-primary" href="/dashboard">Browse jobs</Link></header><div className="content-wrap"><section className="panel jobs-panel"><div className="section-heading"><div><h3>Saved opportunities</h3><p>Only you can view and manage these records</p></div><span className="section-tag">{records.length} saved</span></div>{error ? <div className="empty-state"><strong>Could not load saved jobs</strong><span>{error.message}</span></div> : records.length === 0 ? <div className="empty-state"><Bookmark size={28} /><strong>No saved jobs yet</strong><span>Save a job from the overview to keep it here.</span></div> : <div className="job-list">{records.map((record) => record.jobs && <article className="job-card" key={record.job_id}><div className="job-card-main"><div className="job-source">{record.jobs.source || "Job listing"}<span>·</span>{record.status}</div><h4>{record.jobs.title}</h4><div className="job-meta"><span><Building2 size={14} />{record.jobs.company || "Company not specified"}</span><span><MapPin size={14} />{[record.jobs.city,record.jobs.state].filter(Boolean).join(", ") || "Location not specified"}</span></div></div><div className="job-card-actions"><JobSaveButton userId={auth.user.id} jobId={record.job_id} initiallySaved /><a className="icon-link" href={record.jobs.link || "#"} target="_blank" rel="noreferrer" aria-label="Open job"><ArrowUpRight size={18}/></a></div></article>)}</div>}</section></div></section></main>;
}
