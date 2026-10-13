import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Users, BriefcaseBusiness, Building2 } from "lucide-react";

import { AdminUserControls } from "@/components/admin-user-controls";
import { LogoutButton } from "@/components/logout-button";
import { QueueScrapeForm } from "@/components/queue-scrape-form";
import { createClient } from "@/lib/supabase/server";

type Profile = { id: string; display_name: string | null; created_at: string; is_active: boolean; user_roles: { role: string }[] };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/login");
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle();
  if (roleRow?.role !== "admin") redirect("/dashboard");

  const [{ data: users, error: usersError, count: usersCount }, { count: jobsCount }, { data: sources }, { data: runs, error: runsError }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,created_at,is_active,user_roles(role)", { count: "exact" }).order("created_at", { ascending: false }).limit(100),
    supabase.from("jobs").select("job_id", { count: "exact", head: true }),
    supabase.from("jobs").select("source"),
    supabase.from("scrape_runs").select("id,source,status,max_age_hours,created_at,result_summary,error_message").order("created_at", { ascending: false }).limit(10),
  ]);
  const profiles = (users ?? []) as unknown as Profile[];
  const sourceCounts = new Map<string, number>();
  for (const item of sources ?? []) { const key = item.source || "Other"; sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1); }

  return <main className="app-shell"><aside className="sidebar"><Link href="/dashboard" className="brand"><span className="brand-mark">J</span><span>Job Intelligence</span></Link><div className="nav-label">Workspace</div><Link className="nav-item" href="/dashboard"><BriefcaseBusiness size={17} /> User dashboard</Link><div className="nav-label section-gap">Administration</div><Link className="nav-item active" href="/admin"><ShieldCheck size={17} /> Admin console</Link><div className="sidebar-bottom"><div className="user-chip"><div className="avatar">A</div><div className="user-copy"><strong>Administrator</strong><span>{auth.user.email}</span></div></div><LogoutButton /></div></aside><section className="main-panel"><header className="topbar"><div><p className="eyebrow">Administration / Overview</p><h1>System administration</h1></div><Link href="/dashboard" className="button button-muted"><ArrowLeft size={15}/> User view</Link></header><div className="content-wrap"><section className="welcome-row admin-welcome"><div><h2>Admin console</h2><p>Manage accounts and monitor the shared job catalog.</p></div><span className="welcome-icon"><ShieldCheck size={22}/></span></section><section className="metric-grid"><Metric label="User accounts" value={(usersCount ?? 0).toLocaleString()} note="Registered profiles" icon={<Users size={18}/>} /><Metric label="Jobs in catalog" value={(jobsCount ?? 0).toLocaleString()} note="Shared job records" icon={<BriefcaseBusiness size={18}/>} /><Metric label="Job sources" value={sourceCounts.size.toString()} note="Currently represented" icon={<Building2 size={18}/>} /><Metric label="Active users" value={profiles.filter((user)=>user.is_active).length.toString()} note="From latest 100 accounts" icon={<ShieldCheck size={18}/>} /></section><section className="panel source-panel"><div className="section-heading"><div><h3>Jobs by source</h3><p>Current catalog distribution</p></div></div><div className="source-bars">{[...sourceCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([source,count])=><div className="source-bar-row" key={source}><div className="source-bar-label"><span>{source}</span><strong>{count}</strong></div><div className="bar-track"><span style={{width:`${Math.max(4,count/Math.max(1,Math.max(...sourceCounts.values()))*100)}%`}}/></div></div>)}</div></section><section className="panel jobs-panel"><div className="section-heading"><div><h3>Scraper queue</h3><p>Queue work for the separate Python worker</p></div></div><QueueScrapeForm userId={auth.user.id}/>{runsError ? <div className="inline-warning">Apply the included migration to enable scrape tracking.</div> : <div className="run-list">{(runs ?? []).map((run)=><div className="run-row" key={run.id}><span className={`status-pill status-${run.status}`}>{run.status}</span><strong>{run.source}</strong><span>Last {run.max_age_hours} hours</span><time>{new Date(run.created_at).toLocaleString()}</time><small>{run.error_message || run.result_summary || "Waiting for worker"}</small></div>)}</div>}</section><section className="panel jobs-panel"><div className="section-heading"><div><h3>User management</h3><p>Change roles or disable dashboard access</p></div><span className="section-tag">{profiles.length} shown</span></div>{usersError ? <div className="empty-state"><strong>Could not load users</strong><span>{usersError.message}. Apply the Supabase migration.</span></div> : <div className="user-table-wrap"><table className="user-table"><thead><tr><th>User</th><th>Joined</th><th>Status</th><th>Role and access</th></tr></thead><tbody>{profiles.map((profile)=><tr key={profile.id}><td><strong>{profile.display_name || "New user"}</strong><small>{profile.id}</small></td><td>{new Date(profile.created_at).toLocaleDateString()}</td><td><span className={`status-pill ${profile.is_active ? "status-active":"status-paused"}`}>{profile.is_active ? "Active":"Disabled"}</span></td><td><AdminUserControls userId={profile.id} role={profile.user_roles?.[0]?.role || "user"} active={profile.is_active}/></td></tr>)}</tbody></table></div>}</section></div></section></main>;
}

function Metric({label,value,note,icon}:{label:string;value:string;note:string;icon:React.ReactNode}) { return <article className="metric-card"><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{note}</small></article>; }
