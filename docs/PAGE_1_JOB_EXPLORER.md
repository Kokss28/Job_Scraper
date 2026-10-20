# 💼 Screen 1: Job Explorer & Application Hub

---

## 🎯 Purpose & User Personas
The **Job Explorer & Application Hub** is the operational workspace for both tech job seekers and talent sourcers. It turns a raw database of scraped job listings into an interactive, lightning-fast discovery engine with precise dual-range experience sliders, geographic clustering, and instant application links.

---

## ⚙️ Core Features & Capabilities

### 1. Dual-Range Experience Selector & Career Tier Filter
- **Numeric Min & Max Sliders**: Allows selecting an exact experience band (e.g. `2.0` to `5.0` years).
- **Career Tier Presets**:
  - 🟢 **Fresher / Entry Level (0 – 2 Years)**: College graduates, trainee software engineers, junior analysts.
  - 🔵 **Mid-Level (2 – 5 Years)**: Core backend developers, full-stack engineers, data engineers.
  - 🟣 **Senior Level (5 – 8 Years)**: Senior developers, team leads, system architects.
  - 🟠 **Staff & Leadership (8+ Years)**: Principal engineers, directors, VP of engineering.

### 2. Multi-Dimensional Search & Filtering Strip
- **Global Search**: Substring matching across title, company, skills, and full description.
- **Source Multi-Select**: Filter between `LinkedIn`, `Naukri`, and `Indeed`.
- **Top Indian Tech Hubs**: Filter by primary IT corridors:
  - Bengaluru
  - Hyderabad
  - Pune
  - Delhi NCR (Noida, Gurugram, Delhi)
  - Mumbai
  - Chennai
  - Kolkata & Tier-2 emerging hubs
- **Degree Filter**: Filter by educational credentials (`B.Tech / B.E.`, `BCA / MCA`, `Master's / M.Tech`, etc.).

### 3. Interactive Data Table & Rich Drawer Preview
- **Clean Table Columns**:
  - Job Title (with verified badge)
  - Company
  - Source Platform Badge
  - Experience Required (`Min - Max Yrs`)
  - Tech Hub Location
  - Degree Qualification
  - Ingestion Date & Direct Apply Action
- **Inspection Drawer**: Clicking any job card reveals the complete parsed description, extracted technical skills, and candidate requirements.

### 4. Direct Export
- **One-Click CSV Export**: Download the active filtered view to CSV for CRM import, recruitment spreadsheets, or offline analysis.
