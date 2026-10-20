"""Process scrape requests queued by the Next.js admin dashboard.

Run from the repository root with:
    python -m pipeline.supabase_scrape_worker

The Supabase service-role key is used only by this trusted worker process.
Never expose that key to the Next.js browser bundle.
"""

from __future__ import annotations

import csv
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

from config import (
    INDEED_LOCATION,
    INDEED_MAX_JOBS_PER_KEYWORD,
    LINKEDIN_LOCATION,
    LINKEDIN_MAX_JOBS_PER_KEYWORD,
    NAUKRI_HEADLESS,
    NAUKRI_JOB_TITLES,
    NAUKRI_MAX_JOBS,
    NAUKRI_MAX_PAGES,
    OUTPUT_DIR,
    SEARCH_KEYWORDS,
)
from pipeline.orchestrator import run_pipeline
from pipeline.storage import JobStore
from scrapers.indeed.scraper import collect_indeed_jobs
from scrapers.linkedin.scraper import collect_linkedin_jobs
from scrapers.naukri.scraper import collect_naukri_jobs

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


def supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    return create_client(url, key)


def sync_jobs(client: Client) -> int:
    csv_path = Path(OUTPUT_DIR) / "unified_jobs.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Scraper output not found: {csv_path}")

    synced = 0
    with csv_path.open("r", newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        batch: list[dict[str, Any]] = []
        for row in reader:
            batch.append(row)
            if len(batch) == 100:
                client.table("jobs").upsert(batch, on_conflict="job_id").execute()
                synced += len(batch)
                batch.clear()
        if batch:
            client.table("jobs").upsert(batch, on_conflict="job_id").execute()
            synced += len(batch)
    return synced


def process_run(client: Client, run: dict[str, Any]) -> None:
    run_id = run["id"]
    source = run["source"]
    age = int(run.get("max_age_hours") or 24)
    use_linkedin = source in {"all", "linkedin"}
    use_naukri = source in {"all", "naukri"}
    use_indeed = source in {"all", "indeed"}

    try:
        report = run_pipeline(
            store=JobStore(),
            linkedin_collector=collect_linkedin_jobs if use_linkedin else None,
            linkedin_kwargs={
                "keywords": SEARCH_KEYWORDS,
                "location": LINKEDIN_LOCATION,
                "max_jobs": LINKEDIN_MAX_JOBS_PER_KEYWORD,
                "max_age_hours": age,
            } if use_linkedin else None,
            naukri_collector=collect_naukri_jobs if use_naukri else None,
            naukri_kwargs={
                "titles": NAUKRI_JOB_TITLES,
                "max_pages": NAUKRI_MAX_PAGES,
                "max_jobs": NAUKRI_MAX_JOBS,
                "headless": NAUKRI_HEADLESS,
            } if use_naukri else None,
            indeed_collector=collect_indeed_jobs if use_indeed else None,
            indeed_kwargs={
                "keywords": SEARCH_KEYWORDS,
                "location": INDEED_LOCATION,
                "max_jobs": INDEED_MAX_JOBS_PER_KEYWORD,
                "max_age_hours": age,
            } if use_indeed else None,
        )
        synced = sync_jobs(client)
        client.table("scrape_runs").update({
            "status": "completed",
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "result_summary": f"{report.summary()}\nSynced {synced} CSV rows to Supabase.",
        }).eq("id", run_id).execute()
    except Exception as error:
        client.table("scrape_runs").update({
            "status": "failed",
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "error_message": str(error)[:4000],
        }).eq("id", run_id).execute()
        print(f"[Supabase worker] Run {run_id} failed: {error}")


def main() -> None:
    client = supabase_client()
    print("[Supabase worker] Listening for admin scrape requests.")
    while True:
        claimed = client.rpc("claim_scrape_run").execute().data or []
        if claimed:
            for run in claimed:
                print(f"[Supabase worker] Processing {run['id']} ({run['source']}).")
                process_run(client, run)
        else:
            time.sleep(3)


if __name__ == "__main__":
    main()
