# 🇮🇳 Job Intelligence System & Enterprise Dashboard
### High-Performance Talent Analytics & Job Scraping Platform for India

---

## 📌 Executive Summary

The **Job Intelligence System** is an enterprise-grade analytics, scraping, and exploration platform engineered specifically for **recruiters, talent acquisition leaders, and tech job seekers across India**. 

It unifies real-time job postings from **LinkedIn**, **Naukri**, and **Indeed**, normalizes erratic titles and location strings into a structured 17-column data contract, enriches missing degree specifications using pre-trained **Machine Learning classifiers**, and presents everything through an executive, premium multi-screen dashboard.

---

## 🧭 Multi-Screen Architecture & Navigation

To avoid cognitive overload and ensure lightning-fast workflow execution, the dashboard is partitioned into **5 dedicated, purpose-built screens**:

| Screen / Page | Primary Target Audience | Core Focus |
| :--- | :--- | :--- |
| **[1. Job Explorer & Application Hub](PAGE_1_JOB_EXPLORER.md)** | Job Seekers & Talent Sourcers | Dual Min/Max experience search, instant full-text filtering, location clustering, rich job drawer, direct application links. |
| **[2. Experience & Career Intelligence](PAGE_2_EXPERIENCE_INTELLIGENCE.md)** | Hiring Managers & Career Planners | Career Tier breakdown (0-2y, 2-5y, 5-8y, 8+y), experience distribution curve, skill demand across career levels. |
| **[3. Market & Geographic Insights](PAGE_3_MARKET_INSIGHTS.md)** | Recruiters & Market Analysts | Top Indian hiring enterprises (TCS, Infosys, Optum, Citi, etc.), major tech hubs (Bengaluru, Hyderabad, Pune, NCR, Chennai), tech stack rankings. |
| **[4. Live Ingestion & Scraper Studio](PAGE_4_LIVE_SCRAPER.md)** | Admins & Power Recruiters | Multi-source scrape runner (LinkedIn, Naukri, Indeed), freshness time windows (1h to 30d), real-time result ingestion. |
| **[5. Recruiter & Admin Workspace](PAGE_5_ADMIN_CONFIG.md)** | System Administrators & Lead Recruiters | Dynamic master keyword configuration, SQLite $\leftrightarrow$ CSV snapshot sync, batch export center. |

---

## 📊 Core Data Contract (17 Canonical Columns)

Every posting ingested by the platform adheres to this schema:
1. `job_id`: Canonical unique identifier per posting.
2. `source`: Platform origin (`LinkedIn`, `Naukri`, `Indeed`).
3. `title`: Cleaned, standardized job title.
4. `company`: Hiring organization or recruiting firm.
5. `search_keyword`: Query keyword that surfaced the opportunity.
6. `city`: Standardized Indian city / tech hub.
7. `state`: Normalized state / region.
8. `country`: Country identifier (`India`, etc.).
9. `min_experience_years`: Numeric minimum years of experience required.
10. `max_experience_years`: Numeric maximum years of experience required.
11. `experience_review`: Parsed experience classification review text.
12. `skills`: Extracted comma-delimited technical skills and tools.
13. `degree_required`: Minimum qualification (enriched with ML when omitted).
14. `specialization_required`: Academic specialization (e.g. Computer Science).
15. `collected_at`: ISO timestamp of ingestion.
16. `link`: Verified canonical job posting URL.
17. `full_description`: Comprehensive job description and requirements text.

---

## 🚀 Getting Started

### 🌐 Next.js Enterprise Web Portal (Recommended)
The full Next.js serverless web application with Supabase Database, Auth, and RBAC is located in `web/` and running on **`http://localhost:3000`**:
```powershell
cd web
npm run start -p 3000
# or for live development:
# npm run dev
```

### 🐍 Legacy Streamlit Prototype
For running the local python Streamlit prototype:
```powershell
.\.venv\Scripts\Activate.ps1
streamlit run dashboard.py
```
Open **`http://localhost:8501`** in your browser.

