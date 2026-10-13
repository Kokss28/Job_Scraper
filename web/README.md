# Job Intelligence Next.js dashboard

This app replaces the Streamlit presentation layer with a Next.js App Router UI. Supabase provides email/password authentication, Postgres storage, and row-level security. The existing Python scraper stays in place; an optional Python worker runs scrape requests queued by an admin.

## 1. Configure Supabase

1. Create a Supabase project.
2. Copy this folder's `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase project API settings.
3. In Supabase SQL Editor, run `supabase/migrations/202610120001_dashboard.sql`.
4. In Authentication settings, set the site URL to your dashboard URL and add `http://localhost:3000/auth/confirm` and your deployed `/auth/confirm` URL to allowed redirects.
5. Sign up the first account. In SQL Editor, promote that trusted email to admin using the commented SQL at the end of the migration, replacing the example email.

## 2. Import existing jobs

In Supabase Table Editor, open `jobs` and import `../Data/unified_jobs.csv` as CSV. The CSV headers match the migration. `job_id` is the primary key; use upsert/ignore duplicate behavior when importing later snapshots. Importing does not delete existing records.

You can also let the Python worker upsert the latest local CSV after it runs the scraper. Keep the service-role key on the Python server only; never add it to `NEXT_PUBLIC_*` variables or frontend code.

## 3. Run the dashboard

From this directory:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Users can browse/search jobs and manage their own saved jobs. Admin accounts additionally see account controls, system totals, scrape runs, and a scrape request form. The database policies enforce the role and ownership boundaries; hiding an admin link is only presentation.

## 4. Enable admin scrape requests (optional)

Install the root Python requirements (including `supabase`) and add these values to the repository root `.env`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

From the repository root, run:

```powershell
python -m pipeline.supabase_scrape_worker
```

Leave the worker process running. It claims queued runs, calls the existing Python scraper pipeline, and upserts `Data/unified_jobs.csv` into Supabase. The worker currently uses project-wide `SEARCH_KEYWORDS` and the selected source/age window.

## Production notes

- Deploy the `web` directory as a Next.js app and configure the same public Supabase URL/key and auth redirect URLs in the hosting provider.
- Keep the service-role key only in the trusted worker environment.
- The migration makes the shared jobs catalog readable to active signed-in users, while saved jobs are scoped to their owner through RLS.
- The age filter is supported by the LinkedIn and Indeed collectors. The current Naukri collector uses configured titles/page limits and does not filter by posting age.
- The original Streamlit app and scraper are retained; no existing Python dashboard files are removed.
