"""
Live Scrape Runner CLI for Job Intelligence Web Portal.
Invoked by Next.js Scraper Studio to harvest real live jobs from LinkedIn, Naukri, and Indeed.
Enriches degrees, normalizes locations, updates SQLite database and Supabase.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import warnings
from datetime import datetime
import logging
from pathlib import Path

# Suppress sklearn unpickling warnings
warnings.filterwarnings("ignore")

# Configure utf-8 stdout
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Configure logging to write to stdout so Next.js doesn't treat INFO as stderr WARN
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    stream=sys.stdout,
    force=True,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

# Default delays for gentle rate limiting
os.environ.setdefault("LINKEDIN_DELAY_MIN", "1.5")
os.environ.setdefault("LINKEDIN_DELAY_MAX", "3.0")

from config import OUTPUT_DIR, LINKEDIN_LOCATION, NAUKRI_MAX_PAGES, NAUKRI_HEADLESS
from database import import_csv_to_database, DB_PATH
from pipeline.orchestrator import run_pipeline
from pipeline.storage import JobStore
from scrapers.indeed.scraper import collect_indeed_jobs
from scrapers.linkedin.scraper import collect_linkedin_jobs
from scrapers.naukri.scraper import collect_naukri_jobs

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env")
except Exception:
    pass


def log(msg: str):
    timestamp = datetime.now().strftime("%H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line, flush=True)


def parse_args():
    parser = argparse.ArgumentParser(description="Live Job Scraper Runner")
    parser.add_argument("--sources", type=str, default="LinkedIn,Naukri,Indeed", help="Comma-separated sources")
    parser.add_argument("--keywords", type=str, default="Python developer", help="Comma-separated keywords")
    parser.add_argument("--freshness", type=float, default=24.0, help="Manual time range in hours (e.g. 1, 6, 24, 72)")
    parser.add_argument("--location", type=str, default="India", help="Target search location (e.g. India, Bengaluru, Pune)")
    parser.add_argument("--max-jobs", type=int, default=None, help="Optional max jobs limit (omitted for unlimited)")
    parser.add_argument("--enable-details", dest="enable_details", action="store_true", default=True, help="Enable full detail page fetching for rich descriptions and education")
    parser.add_argument("--no-details", dest="enable_details", action="store_false", help="Disable detail page fetching for faster card-only scraping")
    return parser.parse_args()


def main():
    args = parse_args()
    sources = [s.strip().lower() for s in args.sources.split(",") if s.strip()]
    keywords = [k.strip() for k in args.keywords.split(",") if k.strip()]
    freshness = max(0.1, float(args.freshness))
    location = args.location.strip() if getattr(args, "location", None) else "India"
    if not location:
        location = "India"
    max_jobs = args.max_jobs if (args.max_jobs is not None and args.max_jobs > 0) else None
    enable_details = bool(getattr(args, "enable_details", True))

    limit_desc = f"Max {max_jobs} jobs" if max_jobs else "All accessible matching jobs (Unlimited)"
    log(f"Initializing Live Scraper Engine...")
    log(f"Target Platforms: {', '.join([s.capitalize() for s in sources])}")
    log(f"Keywords ({len(keywords)}): {', '.join(keywords)}")
    log(f"Location: {location}")
    log(f"Posting Freshness: Past {freshness:g} Hours | Scope: {limit_desc}")
    log(f"Full Page Fetching (Rich Details & Degree): {'ENABLED' if enable_details else 'DISABLED'}")

    store = JobStore(output_dir=OUTPUT_DIR)
    
    use_linkedin = "linkedin" in sources
    use_naukri = "naukri" in sources
    use_indeed = "indeed" in sources

    linkedin_col = collect_linkedin_jobs if use_linkedin else None
    naukri_col = collect_naukri_jobs if use_naukri else None
    indeed_col = collect_indeed_jobs if use_indeed else None

    # When freshness <= 24h and max-jobs is unlimited, cap search pages to 6 per keyword.
    # On job portals, postings from the last 4-24 hours are concentrated in the first 3-5 pages.
    # Capping prevents infinite crawling through 50 historical pages.
    naukri_max_pages = None
    if freshness <= 24 and max_jobs is None:
        naukri_max_pages = 6

    lk_kwargs = {
        "keywords": keywords,
        "location": location,
        "max_jobs_per_keyword": max_jobs,
        "max_age_hours": freshness,
        "enable_detail_pages": enable_details,
    } if use_linkedin else None

    nk_kwargs = {
        "titles": keywords,
        "location": location,
        "max_pages": naukri_max_pages,
        "max_jobs": max_jobs,
        "max_total": max_jobs,
        "max_age_hours": freshness,
        "enable_detail_pages": enable_details,
        "headless": NAUKRI_HEADLESS,
    } if use_naukri else None

    id_kwargs = {
        "keywords": keywords,
        "location": location,
        "max_jobs": max_jobs,
        "max_jobs_per_keyword": max_jobs,
        "max_age_hours": freshness,
    } if use_indeed else None

    log("Connecting to live job feeds...")
    try:
        report = run_pipeline(
            store=store,
            linkedin_collector=linkedin_col,
            linkedin_kwargs=lk_kwargs,
            naukri_collector=naukri_col,
            naukri_kwargs=nk_kwargs,
            indeed_collector=indeed_col,
            indeed_kwargs=id_kwargs,
            apply_enrichment=True,
        )

        # Save the current extracted batch to a dedicated CSV file
        import csv
        from pipeline.schema import CSV_FIELDS
        latest_csv = ROOT_DIR / "Data" / "latest_extracted_jobs.csv"
        extracted_batch = getattr(report, "extracted_jobs", None) or getattr(report, "new_jobs", [])
        
        with open(latest_csv, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
            writer.writeheader()
            for job in extracted_batch:
                writer.writerow(job.to_csv_row())

        log(f"Current extraction batch ({len(extracted_batch)} jobs from {', '.join([s.capitalize() for s in sources])}) saved to {latest_csv.name}")

        log("Scraping completed! Syncing to SQLite local database...")
        unified_csv = ROOT_DIR / "Data" / "unified_jobs.csv"
        if unified_csv.exists():
            import_csv_to_database(unified_csv)

        # Check total count in SQLite
        import sqlite3
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM jobs")
            total_jobs = cursor.fetchone()[0]

        new_count = report.new_jobs_written
        log(f"Catalog successfully synced. Total jobs in database: {total_jobs} (+{new_count} newly added to catalog, {len(extracted_batch)} in this batch)")

        # Attempt Supabase sync if credentials available
        sb_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        sb_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if sb_url and sb_key and not sb_key.startswith("your_"):
            try:
                from pipeline.supabase_scrape_worker import supabase_client, sync_jobs
                client = supabase_client()
                synced = sync_jobs(client)
                log(f"Supabase Cloud synchronized: {synced} jobs updated.")
            except Exception as sb_err:
                log(f"Supabase sync note: {sb_err}")

        def _get_val(obj, key, default=""):
            if isinstance(obj, dict):
                return obj.get(key, default)
            return getattr(obj, key, default)

        by_source = {}
        for j in extracted_batch:
            src = _get_val(j, "source", "Unknown")
            by_source[src] = by_source.get(src, 0) + 1

        sample_jobs = []
        for j in extracted_batch[:8]:
            sample_jobs.append({
                "title": _get_val(j, "title", ""),
                "company": _get_val(j, "company", ""),
                "city": _get_val(j, "city", ""),
                "source": _get_val(j, "source", ""),
                "link": _get_val(j, "link", ""),
            })

        summary_json = {
            "status": "success",
            "extracted_jobs": len(extracted_batch),
            "new_jobs": new_count,
            "total_jobs": total_jobs,
            "sources": sources,
            "by_source": by_source,
            "freshness": freshness,
            "keywords": keywords,
            "location": location,
            "latest_csv": "latest_extracted_jobs.csv",
            "sample_jobs": sample_jobs,
        }
        print(f"__RESULT_JSON__{json.dumps(summary_json)}", flush=True)

    except Exception as exc:
        log(f"Error during scrape execution: {exc}")
        err_json = {
            "status": "error",
            "message": str(exc),
        }
        print(f"__RESULT_JSON__{json.dumps(err_json)}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
