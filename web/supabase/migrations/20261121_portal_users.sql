-- ============================================================================
-- CANDIDATE PORTAL & USER GOVERNANCE TABLE CREATION (SUPABASE CLOUD)
-- ============================================================================
-- How to apply:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/wzixisxbeshiiarjlgnr
-- 2. Click "SQL Editor" in the left sidebar.
-- 3. Click "+ New query", paste this entire script, and click "Run".
-- ============================================================================

create table if not exists public.portal_users (
  user_id text primary key,
  full_name text not null,
  email text unique not null,
  mobile_number text,
  username text unique not null,
  qualification text,
  college_name text,
  date_of_birth text,
  address text,
  created_date timestamptz not null default now(),
  status text not null default 'Active',
  data_scope_hours text not null default 'all',
  daily_apply_limit integer not null default 10,
  role text not null default 'candidate',
  is_hidden_from_dashboard integer not null default 0,
  admin_code text
);

create table if not exists public.portal_admin_codes (
  code_id text primary key,
  unique_admin_code text unique not null,
  status text not null default 'Unused',
  created_date timestamptz not null default now(),
  used_by_user_id text,
  data_scope_hours text not null default 'all',
  daily_apply_limit integer not null default 10,
  role text not null default 'candidate'
);

create table if not exists public.portal_job_applications (
  application_id text primary key,
  user_id text not null,
  job_id text not null,
  application_date timestamptz not null default now(),
  application_status text not null default 'Submitted',
  notes text,
  unique (user_id, job_id)
);

-- Grant full permissions
grant all on public.portal_users to service_role, authenticated, anon;
grant all on public.portal_admin_codes to service_role, authenticated, anon;
grant all on public.portal_job_applications to service_role, authenticated, anon;
grant usage on schema public to service_role, authenticated, anon;
