-- Job Intelligence dashboard schema.
-- Run in Supabase SQL Editor before importing Data/unified_jobs.csv.

create table if not exists public.jobs (
  job_id text primary key,
  source text,
  title text not null,
  company text,
  search_keyword text,
  city text,
  state text,
  country text,
  min_experience_years text,
  max_experience_years text,
  experience_review text,
  skills text,
  degree_required text,
  specialization_required text,
  collected_at text,
  link text,
  full_description text
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'recruiter', 'admin'))
);

create table if not exists public.saved_jobs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null references public.jobs(job_id) on delete cascade,
  status text not null default 'saved' check (status in ('saved', 'applied', 'dismissed')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete restrict,
  source text not null check (source in ('linkedin', 'naukri', 'indeed', 'all')),
  max_age_hours integer not null default 24 check (max_age_hours between 1 and 720),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  result_summary text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

insert into public.profiles (id, display_name)
select id, nullif(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;
insert into public.user_roles (user_id, role)
select id, 'user' from auth.users
on conflict (user_id) do nothing;

create index if not exists jobs_collected_at_idx on public.jobs (collected_at desc);
create index if not exists jobs_source_idx on public.jobs (source);
create index if not exists jobs_city_idx on public.jobs (city);
create index if not exists saved_jobs_user_created_idx on public.saved_jobs (user_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists scrape_runs_created_idx on public.scrape_runs (created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  ) and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_active = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_job_dashboard on auth.users;
create trigger on_auth_user_created_job_dashboard
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare old_role text;
begin
  if not public.is_admin() then raise exception 'admin role required' using errcode = '42501'; end if;
  if new_role not in ('user', 'recruiter', 'admin') then raise exception 'invalid role'; end if;
  select role into old_role from public.user_roles where user_id = target_user_id for update;
  if old_role is null then raise exception 'user not found'; end if;
  if old_role = 'admin' and new_role = 'user'
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'cannot demote the last admin';
  end if;
  update public.user_roles set role = new_role where user_id = target_user_id;
  insert into public.audit_logs(actor_id, action, target_user_id, details)
  values (auth.uid(), 'user.role_changed', target_user_id, jsonb_build_object('from', old_role, 'to', new_role));
end;
$$;

create or replace function public.admin_set_user_active(target_user_id uuid, new_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'admin role required' using errcode = '42501'; end if;
  if target_user_id = auth.uid() and not new_active then raise exception 'cannot deactivate your own account'; end if;
  update public.profiles set is_active = new_active where id = target_user_id;
  if not found then raise exception 'user not found'; end if;
  insert into public.audit_logs(actor_id, action, target_user_id, details)
  values (auth.uid(), 'user.active_changed', target_user_id, jsonb_build_object('active', new_active));
end;
$$;

create or replace function public.claim_scrape_run()
returns setof public.scrape_runs
language sql
security definer
set search_path = ''
as $$
  with next_run as (
    select id from public.scrape_runs
    where status = 'queued'
    order by created_at
    for update skip locked
    limit 1
  )
  update public.scrape_runs as run
  set status = 'running', started_at = now()
  from next_run
  where run.id = next_run.id
  returning run.*;
$$;

alter table public.jobs enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.scrape_runs enable row level security;

revoke all on public.jobs, public.profiles, public.user_roles, public.saved_jobs, public.audit_logs, public.scrape_runs from anon;
revoke all on public.jobs, public.profiles, public.user_roles, public.saved_jobs, public.audit_logs, public.scrape_runs from authenticated;
grant select on public.jobs to authenticated;
grant select on public.profiles, public.user_roles, public.saved_jobs, public.audit_logs, public.scrape_runs to authenticated;
grant insert, update, delete on public.saved_jobs to authenticated;
grant insert on public.scrape_runs to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant usage, select on sequence public.saved_jobs_id_seq to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

drop policy if exists "active users can read jobs" on public.jobs;
create policy "active users can read jobs" on public.jobs
  for select to authenticated using ((select public.is_active_user()));

drop policy if exists "users read own profile or admins read all" on public.profiles;
create policy "users read own profile or admins read all" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "users update own display name" on public.profiles;
create policy "users update own display name" on public.profiles
  for update to authenticated using (id = (select auth.uid()) and (select public.is_active_user()))
  with check (id = (select auth.uid()) and (select public.is_active_user()));

drop policy if exists "users read own role or admins read all" on public.user_roles;
create policy "users read own role or admins read all" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "users manage own saved jobs and admins manage all" on public.saved_jobs;
create policy "users manage own saved jobs and admins manage all" on public.saved_jobs
  for all to authenticated
  using ((user_id = (select auth.uid()) and (select public.is_active_user())) or (select public.is_admin()))
  with check ((user_id = (select auth.uid()) and (select public.is_active_user())) or (select public.is_admin()));

drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "admins read and enqueue scrape runs" on public.scrape_runs;
create policy "admins read and enqueue scrape runs" on public.scrape_runs
  for select to authenticated using ((select public.is_admin()));
create policy "admins enqueue scrape runs" on public.scrape_runs
  for insert to authenticated with check ((select public.is_admin()) and requested_by = (select auth.uid()));

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_active_user() from public, anon;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
revoke all on function public.admin_set_user_active(uuid, boolean) from public, anon;
revoke all on function public.claim_scrape_run() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;
grant execute on function public.claim_scrape_run() to service_role;

-- Promote a trusted account after signing up. Replace the email first, then run:
-- update public.user_roles ur set role = 'admin'
-- from auth.users au where au.id = ur.user_id and au.email = 'your-admin@example.com';
