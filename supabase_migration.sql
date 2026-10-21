-- ============================================================================
-- JOB INTELLIGENCE & SCRAPER PIPELINE: COMPLETE SUPABASE MIGRATION
-- ============================================================================
-- How to apply:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_
-- 2. Click "SQL Editor" in the left sidebar.
-- 3. Click "+ New query", paste this entire script, and click "Run".
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. JOBS TABLE
-- Canonical storage for all normalized job postings across LinkedIn, Naukri, Indeed
-- ============================================================================
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
  full_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Full-Text Search generated column for fast search in dashboard
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'search_vector'
  ) then
    alter table public.jobs add column search_vector tsvector
      generated always as (
        to_tsvector('english',
          coalesce(title, '') || ' ' ||
          coalesce(company, '') || ' ' ||
          coalesce(skills, '') || ' ' ||
          coalesce(city, '') || ' ' ||
          coalesce(search_keyword, '')
        )
      ) stored;
  end if;
end $$;

-- Indexes for performance
create index if not exists idx_jobs_source on public.jobs (source);
create index if not exists idx_jobs_company on public.jobs (company);
create index if not exists idx_jobs_city on public.jobs (city);
create index if not exists idx_jobs_search_keyword on public.jobs (search_keyword);
create index if not exists idx_jobs_collected_at on public.jobs (collected_at desc);
create index if not exists idx_jobs_search_vector on public.jobs using gin (search_vector);

-- Automatically update updated_at timestamp on edit
create or replace function public.update_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
  before update on public.jobs
  for each row execute function public.update_timestamp();

-- ============================================================================
-- 2. USER PROFILES & ROLE-BASED ACCESS CONTROL (RBAC)
-- ============================================================================
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
  requested_by uuid references auth.users(id) on delete set null,
  source text not null check (source in ('linkedin', 'naukri', 'indeed', 'all')),
  max_age_hours integer not null default 24 check (max_age_hours between 1 and 720),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  result_summary text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- Existing users backfill into profiles & user_roles
insert into public.profiles (id, display_name)
select id, nullif(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select id, 'user' from auth.users
on conflict (user_id) do nothing;

create index if not exists saved_jobs_user_created_idx on public.saved_jobs (user_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists scrape_runs_created_idx on public.scrape_runs (created_at desc);

-- ============================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================
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

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
alter table public.jobs enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.scrape_runs enable row level security;

-- Grants
grant usage on schema public to anon, authenticated, service_role;

-- JOBS POLICIES:
-- 1) Anyone (both anon visitors and logged in users) can search & view jobs
grant select on public.jobs to anon, authenticated;
drop policy if exists "allow public read on jobs" on public.jobs;
create policy "allow public read on jobs" on public.jobs
  for select using (true);

-- 2) Service role (Python scraper / backend) has full access
grant all on public.jobs to service_role;

-- SAVED JOBS POLICIES:
grant select, insert, update, delete on public.saved_jobs to authenticated;
grant usage, select on sequence public.saved_jobs_id_seq to authenticated;

drop policy if exists "users manage own saved jobs" on public.saved_jobs;
create policy "users manage own saved jobs" on public.saved_jobs
  for all to authenticated
  using ((user_id = (select auth.uid()) and (select public.is_active_user())) or (select public.is_admin()))
  with check ((user_id = (select auth.uid()) and (select public.is_active_user())) or (select public.is_admin()));

-- PROFILES POLICIES:
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
drop policy if exists "users read own profile or admins read all" on public.profiles;
create policy "users read own profile or admins read all" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "users update own display name" on public.profiles;
create policy "users update own display name" on public.profiles
  for update to authenticated using (id = (select auth.uid()) and (select public.is_active_user()))
  with check (id = (select auth.uid()) and (select public.is_active_user()));

-- USER ROLES POLICIES:
grant select on public.user_roles to authenticated;
drop policy if exists "users read own role or admins read all" on public.user_roles;
create policy "users read own role or admins read all" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- SCRAPE RUNS POLICIES:
grant select, insert on public.scrape_runs to authenticated;
drop policy if exists "admins read scrape runs" on public.scrape_runs;
create policy "admins read scrape runs" on public.scrape_runs
  for select to authenticated using ((select public.is_admin()));

drop policy if exists "admins enqueue scrape runs" on public.scrape_runs;
create policy "admins enqueue scrape runs" on public.scrape_runs
  for insert to authenticated with check ((select public.is_admin()));

-- AUDIT LOGS POLICIES:
grant select on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;
drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs
  for select to authenticated using ((select public.is_admin()));

-- Functions execution permissions
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.claim_scrape_run() to service_role;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;
