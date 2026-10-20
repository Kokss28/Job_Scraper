# 🇮🇳 Job Intelligence Next.js Web Application
### Enterprise Talent Analytics, Serverless Web App & Multi-Source Scraper Portal

A Next.js (App Router) web application engineered for **tech job seekers, recruiters, and talent acquisition leaders across India**. Built with **Supabase (PostgreSQL, Auth, RLS)**, advanced **Role-Based Access Control (RBAC)**, and Recharts interactive analytics.

---

## 🧭 Multi-Screen Architecture

To avoid clutter and cognitive overload, the web app is partitioned into **6 dedicated workspaces**:

| Workspace | URL Path | Key Capabilities |
| :--- | :--- | :--- |
| **💼 Job Explorer** | `/dashboard` | Dual Min/Max experience range slider, quick career tier chips, Indian IT hubs filter, direct apply action, job inspection drawer, CSV export. |
| **🎯 Experience Intelligence** | `/dashboard/experience` | Career tier market share, 0–15y experience distribution curve, and in-demand skills by seniority level. |
| **🏢 Market & Hubs** | `/dashboard/market` | Top Indian IT corridors leaderboard, premier hiring enterprises ranking, education distribution, platform sourcing share. |
| **🔖 Saved Opportunities** | `/saved-jobs` | Candidate application tracking pipeline (`saved`, `applied`, `interviewing`, `archived`) with personal notes. |
| **⚡ Scraper Studio** | `/dashboard/scraper` | Dispatch real-time scrape runs across LinkedIn, Naukri, and Indeed with custom freshness windows. |
| **🛡️ Admin & RBAC Console** | `/admin` | Manage user profiles, assign roles (`admin`, `recruiter`, `user`), toggle account access, view audit logs. |

---

## ⚙️ 1. Quickstart & Local Execution

The web app is pre-configured and runs out of the box with the local catalog (1,082 jobs) and can connect to Supabase Cloud for full authentication and real-time syncing.

### Run in Development / Production:
```powershell
cd web
npm run dev
# or for production:
npm run build
npm run start
```
Open **`http://localhost:3000`** in your browser.

---

## 🗄️ 2. Supabase Cloud Configuration (Auth & RBAC)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `web/.env.example` to `web/.env.local`:
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
   ```
3. Open the **SQL Editor** in Supabase and run the migration file:
   [`web/supabase/migrations/202610120001_dashboard.sql`](supabase/migrations/202610120001_dashboard.sql).
4. In **Authentication > URL Configuration**, add `http://localhost:3000/auth/confirm` to the allowed redirects.
5. In **Table Editor > jobs**, click **Import data from CSV** and select `Data/unified_jobs.csv`.
6. Sign up your first account at `http://localhost:3000/auth/sign-up`. Promote it to admin using the query at the bottom of the migration file:
   ```sql
   update public.user_roles ur set role = 'admin'
   from auth.users au where au.id = ur.user_id and au.email = 'your-admin@example.com';
   ```

---

## 🐍 3. Background Scrape Worker

Headless browser scraping (Playwright Chromium and Scrapling) runs via a decoupled Python worker:

1. Add your Supabase credentials to the root `.env`:
   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```
2. Start the worker from the repository root:
   ```powershell
   python -m pipeline.supabase_scrape_worker
   ```
3. When an admin or recruiter dispatches a scrape from the **Scraper Studio** UI, the worker claims the queued request, executes the scrapers, runs ML degree enrichment, and pushes new jobs into Supabase.
