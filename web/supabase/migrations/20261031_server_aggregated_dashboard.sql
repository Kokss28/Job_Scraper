-- ============================================================================
-- HIGH-PERFORMANCE SERVER-AGGREGATED DASHBOARD MIGRATION
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Generated Full Text Search column (fts) and GIN index for instant search
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'fts'
  ) then
    alter table public.jobs add column fts tsvector
      generated always as (
        to_tsvector('english',
          coalesce(title, '') || ' ' ||
          coalesce(company, '') || ' ' ||
          coalesce(skills, '') || ' ' ||
          coalesce(city, '')
        )
      ) stored;
  end if;
end $$;

create index if not exists idx_jobs_fts on public.jobs using gin (fts);
create index if not exists idx_jobs_collected_at on public.jobs (collected_at desc);
create index if not exists idx_jobs_city_state on public.jobs (city, state);
create index if not exists idx_jobs_source on public.jobs (source);

-- 2. Materialized View for Pre-aggregated Dashboard Stats (< 25 KB)
drop materialized view if exists public.dashboard_stats;

create materialized view public.dashboard_stats as
select
  (select count(*) from public.jobs) as total_jobs,
  (
    select coalesce(jsonb_agg(loc), '[]'::jsonb)
    from (
      select 
        coalesce(nullif(trim(state), ''), 'Other') as state,
        coalesce(nullif(trim(city), ''), 'Other') as city,
        count(*) as count
      from public.jobs
      where lower(trim(city)) != 'not specified' and lower(trim(city)) != ''
      group by 1, 2
      order by count desc
      limit 100
    ) loc
  ) as by_location,
  (
    select coalesce(jsonb_agg(sk), '[]'::jsonb)
    from (
      select trim(s) as skill, count(*) as count
      from public.jobs, unnest(string_to_array(skills, ',')) as s
      where trim(s) <> '' 
        and lower(trim(s)) <> 'not specified'
        and length(trim(s)) > 1
      group by 1
      order by count desc
      limit 40
    ) sk
  ) as top_skills,
  (
    select coalesce(jsonb_agg(d), '[]'::jsonb)
    from (
      select 
        date(collected_at) as date,
        count(*) as count
      from public.jobs
      where collected_at is not null
      group by 1
      order by date desc
      limit 30
    ) d
  ) as daily_trend;

-- Create unique index to allow CONCURRENT refreshes (zero downtime)
create unique index if not exists idx_dashboard_stats_singleton on public.dashboard_stats ((1));

-- Grant access so anon and authenticated users can read stats view
grant select on public.dashboard_stats to anon, authenticated, service_role;

-- 3. Stored Procedure for zero-downtime refresh callable via RPC
create or replace function public.refresh_dashboard_stats()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently public.dashboard_stats;
end;
$$;

grant execute on function public.refresh_dashboard_stats() to anon, authenticated, service_role;
