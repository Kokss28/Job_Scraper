# ⚡ Screen 4: Live Ingestion & Scraper Studio

---

## 🎯 Purpose & User Personas
Designed for **Platform Administrators and Talent Sourcers** requiring fresh, on-demand candidate leads. It allows triggering scraping runs directly from the web interface without touching terminal scripts or restarting processes.

---

## ⚙️ Core Features & Capabilities

### 1. Multi-Source Scraping Dispatcher
- **Target Selection**:
  - `LinkedIn` (powered by `scrapling` and headless browser sessions)
  - `Naukri` (powered by `playwright` with Chromium engine)
  - `Indeed` (powered by `python-jobspy`)
  - `All Sources` (concurrent pipeline execution)

### 2. Posting Freshness Window
- Target recent postings to catch openings before they are flooded with applications:
  - **Last 1 Hour**: Immediate live updates.
  - **Last 6 Hours**: Half-day batch.
  - **Last 24 Hours**: Daily collection cycle (recommended default).
  - **Last 7 Days**: Weekly market catch-up.
  - **Last 30 Days**: Comprehensive monthly harvest.

### 3. Keyword & Geographic Targeting
- **Keywords**: Uses the configured master keywords or custom ad-hoc terms typed directly in the UI.
- **Location Target**: Filter by `India`, `Bengaluru`, `Hyderabad`, `Pune`, `Mumbai`, `Delhi NCR`, `Chennai`.

### 4. Real-Time Pipeline Feedback
- As the scraper executes, the screen provides:
  - Total Raw Postings Discovered.
  - Validated & Normalized Records.
  - Duplicates Skipped.
  - Newly Stored Records.
  - Live table preview of the latest scraped jobs with immediate CSV download.
