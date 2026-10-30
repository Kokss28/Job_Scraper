"""
Audit Logger & CSV Tracking Engine for Live Job Extractions.

Features:
- Records an append-only master log: Data/extraction_history.csv (Excel-ready UTF-8 BOM).
- Saves individual timestamped batch CSV files: Data/extractions/Jobs_<Domain>_<Timestamp>_<N>jobs.csv.
- Maintains Data/latest_extracted_jobs.csv for backward compatibility with dashboard APIs.
- Captures Extraction Time (IST & UTC), Domain, Keywords, Total Extracted, New Added, Total in Database, and Platform Yield.
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

# Cross-platform stdout encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "Data"
DATE_BASE_DIR = DATA_DIR / "date"
EXTRACTIONS_DIR = DATA_DIR / "extractions"
HISTORY_CSV_PATH = DATA_DIR / "extraction_history.csv"
LATEST_CSV_PATH = DATA_DIR / "latest_extracted_jobs.csv"


def get_daily_folder(date_str: Optional[str] = None) -> Path:
    """
    Returns (and automatically creates) the date-specific folder:
    Data/date/<YYYY-MM-DD>/
    Defaults to today's date in IST.
    """
    if not date_str:
        date_str = get_timestamps()["date_ist"]
    daily_folder = DATE_BASE_DIR / date_str
    daily_folder.mkdir(parents=True, exist_ok=True)
    return daily_folder

# Pre-defined domains
DOMAIN_DEFINITIONS = [
    {
        "slot": 0,
        "name": "Data & Analytics",
        "keywords": ["data analyst", "data scientist", "data engineer", "business analyst", "power bi", "analytics"],
    },
    {
        "slot": 1,
        "name": "Python Development",
        "keywords": ["python developer", "python backend", "django", "fastapi", "flask", "python"],
    },
    {
        "slot": 2,
        "name": "Java Development",
        "keywords": ["java developer", "full stack java", "spring boot", "core java", "java"],
    },
    {
        "slot": 3,
        "name": "Cloud & DevOps",
        "keywords": ["cloud engineer", "aws devops", "azure engineer", "kubernetes", "devops", "cloud", "aws", "gcp"],
    },
]

# History CSV Columns
HISTORY_FIELDS = [
    "Extraction_Time_IST",
    "Extraction_Time_UTC",
    "Domain",
    "Slot",
    "Keywords",
    "Location",
    "Sources",
    "Jobs_Extracted_Now",
    "New_Jobs_Added",
    "Total_Database_Jobs",
    "Yield_LinkedIn",
    "Yield_Naukri",
    "Yield_Indeed",
    "Duration_Seconds",
    "Status",
    "Batch_CSV_File",
    "Batch_CSV_Path",
    "Error_Notes",
]

# Batch CSV Canonical Columns (Excel Enhanced)
BATCH_CSV_FIELDS = [
    "extracted_at_ist",
    "domain",
    "source",
    "title",
    "company",
    "city",
    "state",
    "country",
    "min_experience_years",
    "max_experience_years",
    "skills",
    "degree_required",
    "specialization_required",
    "search_keyword",
    "experience_review",
    "link",
    "job_id",
    "extracted_at_utc",
    "collected_at",
    "full_description",
]


def get_timestamps() -> Dict[str, str]:
    """Returns formatted timestamps in IST, UTC, and filename-safe string."""
    utc_now = datetime.now(timezone.utc)
    ist_now = utc_now + timedelta(hours=5, minutes=30)
    return {
        "utc": utc_now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "ist": ist_now.strftime("%Y-%m-%d %I:%M:%S %p IST"),
        "date_ist": ist_now.strftime("%Y-%m-%d"),
        "time_ist": ist_now.strftime("%I:%M:%S %p"),
        "stamp": ist_now.strftime("%Y%m%d_%H%M%S"),
    }


def detect_domain_from_keywords(keywords: Union[str, List[str], None], domain_hint: Optional[str] = None) -> Tuple[str, Optional[int]]:
    """Deduces the domain name and slot number from given keywords or domain hint."""
    if domain_hint and domain_hint.strip():
        hint_clean = domain_hint.strip()
        for d in DOMAIN_DEFINITIONS:
            if hint_clean.lower() in d["name"].lower() or d["name"].lower() in hint_clean.lower():
                return d["name"], d["slot"]
        return hint_clean, None

    if not keywords:
        return "General Extraction", None

    if isinstance(keywords, list):
        kw_str = " ".join(keywords).lower()
    else:
        kw_str = str(keywords).lower()

    for d in DOMAIN_DEFINITIONS:
        for term in d["keywords"]:
            if term in kw_str:
                return d["name"], d["slot"]

    return "Custom Extraction", None


def save_batch_extraction_csv(
    jobs: List[Any],
    domain: str,
    keywords: str = "",
    location: str = "India",
    date_str: Optional[str] = None,
) -> Tuple[Path, str, int]:
    """
    Saves and appends the extracted jobs into ONE SINGLE consolidated daily file:
    Data/date/<YYYY-MM-DD>/Jobs_<YYYY-MM-DD>.csv
    Inside this single file, every row contains the exact extraction time, domain, source,
    and all job details.
    Uses UTF-8 BOM (utf-8-sig) so Microsoft Excel opens it seamlessly.
    """
    ts = get_timestamps()
    cur_date = date_str or ts["date_ist"]
    daily_folder = get_daily_folder(cur_date)

    filename = f"Jobs_{cur_date}.csv"
    single_file_path = daily_folder / filename

    def _extract_job_dict(j: Any) -> Dict[str, Any]:
        if hasattr(j, "to_csv_row"):
            d = j.to_csv_row()
        elif isinstance(j, dict):
            d = dict(j)
        else:
            d = {k: getattr(j, k, "") for k in dir(j) if not k.startswith("_")}
        return d

    # Read existing job_ids from the single file to prevent duplicate rows
    existing_job_ids = set()
    file_exists = single_file_path.exists() and single_file_path.stat().st_size > 0
    if file_exists:
        try:
            with open(single_file_path, "r", encoding="utf-8-sig") as f_in:
                reader = csv.DictReader(f_in)
                for row in reader:
                    jid = row.get("job_id")
                    if jid:
                        existing_job_ids.add(jid)
        except Exception:
            pass

    # Append new jobs to the single daily file
    written_count = 0
    try:
        with open(single_file_path, "a", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=BATCH_CSV_FIELDS, extrasaction="ignore")
            if not file_exists:
                writer.writeheader()
            for item in jobs:
                row = _extract_job_dict(item)
                jid = row.get("job_id", "")
                if jid and jid in existing_job_ids:
                    continue  # Avoid duplicate entries on the same day
                row["extracted_at_ist"] = ts["ist"]
                row["extracted_at_utc"] = ts["utc"]
                row["domain"] = domain
                writer.writerow(row)
                if jid:
                    existing_job_ids.add(jid)
                written_count += 1
    except (PermissionError, OSError) as e:
        print(f"[AuditLogger] Notice: {single_file_path.name} is currently open in Excel or another program: {e}", flush=True)

    # Update Data/latest_extracted_jobs.csv for web dashboard compatibility
    try:
        from pipeline.schema import CSV_FIELDS
        with open(LATEST_CSV_PATH, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
            writer.writeheader()
            for item in jobs:
                row = _extract_job_dict(item)
                writer.writerow(row)
    except (PermissionError, OSError):
        pass

    return single_file_path, filename, len(jobs)


def record_extraction_run(
    domain: str,
    slot: Optional[int] = None,
    keywords: str = "",
    location: str = "India",
    sources: str = "LinkedIn,Naukri,Indeed",
    extracted_count: int = 0,
    new_jobs_added: int = 0,
    total_db_jobs: int = 0,
    by_source: Optional[Dict[str, int]] = None,
    duration_seconds: float = 0.0,
    status: str = "SUCCESS",
    batch_filename: str = "",
    batch_file_path: Optional[Path] = None,
    error_notes: str = "",
    date_str: Optional[str] = None,
) -> Path:
    """
    Appends an execution entry into the master historical log: Data/extraction_history.csv.
    Initializes file with UTF-8 BOM headers if it does not exist.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ts = get_timestamps()
    slot_label = f"Slot {slot}" if slot is not None else "Manual"

    source_counts = by_source or {}
    lk_count = source_counts.get("LinkedIn", source_counts.get("linkedin", 0))
    nk_count = source_counts.get("Naukri", source_counts.get("naukri", 0))
    id_count = source_counts.get("Indeed", source_counts.get("indeed", 0))

    rel_batch_path = ""
    if batch_file_path:
        try:
            rel_batch_path = str(Path(batch_file_path).relative_to(ROOT_DIR)).replace("\\", "/")
        except Exception:
            rel_batch_path = str(batch_file_path).replace("\\", "/")

    entry = {
        "Extraction_Time_IST": ts["ist"],
        "Extraction_Time_UTC": ts["utc"],
        "Domain": domain,
        "Slot": slot_label,
        "Keywords": keywords,
        "Location": location,
        "Sources": sources,
        "Jobs_Extracted_Now": extracted_count,
        "New_Jobs_Added": new_jobs_added,
        "Total_Database_Jobs": total_db_jobs,
        "Yield_LinkedIn": lk_count,
        "Yield_Naukri": nk_count,
        "Yield_Indeed": id_count,
        "Duration_Seconds": f"{duration_seconds:.1f}",
        "Status": status,
        "Batch_CSV_File": batch_filename,
        "Batch_CSV_Path": rel_batch_path,
        "Error_Notes": error_notes,
    }

    # Append to master historical log across all dates
    try:
        file_exists = HISTORY_CSV_PATH.exists() and HISTORY_CSV_PATH.stat().st_size > 0
        with open(HISTORY_CSV_PATH, "a", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=HISTORY_FIELDS)
            if not file_exists:
                writer.writeheader()
            writer.writerow(entry)
    except (PermissionError, OSError) as e:
        print(f"[AuditLogger] Notice: {HISTORY_CSV_PATH.name} is currently open in Excel or another application.", flush=True)
        fallback_path = DATA_DIR / "extraction_history_overflow.csv"
        try:
            fb_exists = fallback_path.exists() and fallback_path.stat().st_size > 0
            with open(fallback_path, "a", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=HISTORY_FIELDS)
                if not fb_exists:
                    writer.writeheader()
                writer.writerow(entry)
        except Exception:
            pass

    return HISTORY_CSV_PATH


def print_extraction_summary_card(
    domain: str,
    extracted_count: int,
    new_jobs_added: int,
    total_db_jobs: int,
    batch_filename: str,
    duration_seconds: float,
    by_source: Optional[Dict[str, int]] = None,
    batch_file_path: Optional[Path] = None,
):
    """Prints a clear, executive summary block to the terminal."""
    ts = get_timestamps()
    sources_str = ", ".join([f"{k}: {v}" for k, v in (by_source or {}).items()]) if by_source else "Multi-source"

    display_batch = f"Data/date/{ts['date_ist']}/{batch_filename}"
    if batch_file_path:
        try:
            display_batch = str(Path(batch_file_path).relative_to(ROOT_DIR)).replace("\\", "/")
        except Exception:
            display_batch = str(batch_file_path).replace("\\", "/")

    print("\n" + "=" * 78)
    print("📊 EXTRACTION RUN COMPLETE — SINGLE DAILY EXCEL DATASET UPDATED")
    print("=" * 78)
    print(f"  • Extraction Time (IST):  {ts['ist']}")
    print(f"  • Extraction Time (UTC):  {ts['utc']}")
    print(f"  • Target Domain:          {domain}")
    print(f"  • Jobs Extracted in Run:  {extracted_count} jobs")
    print(f"  • New Jobs Added:         +{new_jobs_added} new jobs")
    print(f"  • Total Database Size:    {total_db_jobs} cumulative jobs")
    print(f"  • Platform Yield:         {sources_str}")
    print(f"  • Execution Runtime:      {duration_seconds:.1f}s")
    print(f"  • Single Daily File:      {display_batch}")
    print(f"  • Master Historical Log:  Data/extraction_history.csv")
    print("=" * 78 + "\n", flush=True)


if __name__ == "__main__":
    if "--summary" in sys.argv:
        ts = get_timestamps()
        today_folder = get_daily_folder(ts["date_ist"])
        today_file = today_folder / f"Jobs_{ts['date_ist']}.csv"

        print("\n" + "=" * 78)
        print("📁 DATE-WISE ARCHIVES IN Data/date/:")
        if DATE_BASE_DIR.exists():
            date_folders = sorted([d.name for d in DATE_BASE_DIR.iterdir() if d.is_dir()])
            for df_name in date_folders:
                folder_path = DATE_BASE_DIR / df_name
                csv_files = list(folder_path.glob("*.csv"))
                for cf in csv_files:
                    import pandas as pd
                    try:
                        df_f = pd.read_csv(cf)
                        print(f"  • Data/date/{df_name}/{cf.name} -> {len(df_f)} total jobs saved")
                    except Exception:
                        print(f"  • Data/date/{df_name}/{cf.name}")
        else:
            print("  (No date folders created yet)")
        print("=" * 78)

        if today_file.exists():
            import pandas as pd
            df_today = pd.read_csv(today_file)
            print(f"\n--- TODAY'S CONSOLIDATED DATASET ({today_file.name}) — TOTAL JOBS: {len(df_today)} ---")
            cols = ["extracted_at_ist", "domain", "source", "title", "company", "city"]
            avail_cols = [c for c in cols if c in df_today.columns]
            print(df_today[avail_cols].tail(10).to_string(index=False))
        elif HISTORY_CSV_PATH.exists():
            import pandas as pd
            df = pd.read_csv(HISTORY_CSV_PATH)
            print(f"\n--- MASTER RUNS RECORDED: {len(df)} ---")
            cols = ["Extraction_Time_IST", "Domain", "Jobs_Extracted_Now", "New_Jobs_Added", "Total_Database_Jobs", "Status"]
            print(df[cols].tail(10).to_string(index=False))
    else:
        print(f"[AuditLogger] Date Archive Root:   {DATE_BASE_DIR}")
        ts = get_timestamps()
        print(f"[AuditLogger] Today's Single File: Data/date/{ts['date_ist']}/Jobs_{ts['date_ist']}.csv")
        print(f"[AuditLogger] Current IST Time:    {ts['ist']}")
