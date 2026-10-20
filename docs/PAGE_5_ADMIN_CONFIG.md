# ⚙️ Screen 5: Recruiter & Admin Workspace

---

## 🎯 Purpose & User Personas
Designed for **Lead Recruiters and System Operators**. It handles underlying configuration, master keyword management, storage synchronization, and batch dataset exports without needing code modification.

---

## ⚙️ Core Features & Capabilities

### 1. Master Keyword Configuration Manager
- View and modify the active list of search terms used across all scraping engines.
- Add high-priority emerging roles (e.g., *"LLM Engineer"*, *"Generative AI Engineer"*, *"DevSecOps"*).
- Remove deprecated titles.
- Changes are preserved for subsequent runs.

### 2. Storage & Snapshot Synchronization
- **SQLite ↔ CSV Synchronizer**:
  - Re-syncs the master [Data/jobs.db](file:///d:/Job_Scraper/Data/jobs.db) into [Data/unified_jobs.csv](file:///d:/Job_Scraper/Data/unified_jobs.csv).
  - Ensures Excel and external data consumers always have matching records.
- **Deduplication Cache Overview**:
  - Displays total unique hashes tracked in [Data/seen_job_ids.json](file:///d:/Job_Scraper/Data/seen_job_ids.json).

### 3. Enterprise Batch Export & Reporting
- Download the complete 17-column catalog or filtered snapshots with custom delimiters.
- Direct export into:
  - Formatted UTF-8 CSV
  - JSON Lines for downstream AI / ML model training.

### 4. Admin Security & Control Gate
- Simple authentication toggle to protect ingestion and configuration controls from unauthorized visitors.
