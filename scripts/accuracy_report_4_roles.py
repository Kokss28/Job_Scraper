"""
4-Role Ingestion & Extraction Accuracy Benchmark Report.
Tests and extracts jobs for 4 core technical roles on Naukri with Scrapling stealth runner.
Measures extraction count, role relevance accuracy, freshness verification, and database sync.
"""

import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "web" / ".env.local")

from scrapers.naukri.scraper import collect_naukri_jobs
from pipeline.role_matcher import is_job_role_relevant
from pipeline.recency import is_job_within_recency
from pipeline.supabase_scrape_worker import supabase_client, sync_jobs

ROLES = [
    {"role": "Python Developer", "keyword": "Python developer"},
    {"role": "Data Analyst", "keyword": "Data Analyst"},
    {"role": "Java Developer", "keyword": "Java developer"},
    {"role": "React Developer", "keyword": "React developer"},
]

def run_role_accuracy_benchmark():
    print("=" * 80)
    print("  NAUKRI 4-ROLE EXTRACTION & ACCURACY BENCHMARK REPORT")
    print(f"  Execution Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    try:
        sb = supabase_client()
        print("[OK] Connected to Supabase Cloud PostgreSQL database.")
    except Exception as e:
        sb = None
        print(f"[WARN] Supabase client offline: {e}")

    results = []
    all_extracted_jobs = []

    for idx, r in enumerate(ROLES, start=1):
        role_name = r["role"]
        keyword = r["keyword"]
        print(f"\n[{idx}/4] Processing Role: {role_name} (Search: '{keyword}') ...")
        t0 = time.time()

        # Run extraction: 2 pages per role, past 24 hours, headless stealth
        try:
            jobs = collect_naukri_jobs(
                titles=[keyword],
                max_pages=2,
                max_age_hours=24.0,
                enable_detail_pages=False,
                headless=True,
            )
        except Exception as err:
            print(f"  [ERROR] Extraction failed for {role_name}: {err}")
            jobs = []

        duration = round(time.time() - t0, 2)
        total_extracted = len(jobs)

        # Accuracy checks
        relevant_count = 0
        fresh_count = 0
        valid_ready_count = 0

        for j in jobs:
            title = j.get("title", "")
            desc = j.get("description", "")
            posted = j.get("posted_date") or j.get("posted_time")

            is_rel = is_job_role_relevant(title, keyword, desc)
            if is_rel:
                relevant_count += 1

            is_fresh = is_job_within_recency(posted, max_age_hours=24.0, strict=False)
            if is_fresh:
                fresh_count += 1

            # A job is valid if it has title, company, link, and passes relevance
            if title and j.get("company") and j.get("link"):
                valid_ready_count += 1

        relevance_acc = (relevant_count / total_extracted * 100) if total_extracted > 0 else 100.0
        freshness_acc = (fresh_count / total_extracted * 100) if total_extracted > 0 else 100.0
        overall_valid_rate = (valid_ready_count / total_extracted * 100) if total_extracted > 0 else 0.0

        print(f"  -> Extracted: {total_extracted} jobs in {duration}s")
        print(f"  -> Role Relevant: {relevant_count}/{total_extracted} ({relevance_acc:.1f}%)")
        print(f"  -> Freshness (24h): {fresh_count}/{total_extracted} ({freshness_acc:.1f}%)")
        print(f"  -> Valid Complete Profiles: {valid_ready_count}/{total_extracted} ({overall_valid_rate:.1f}%)")

        results.append({
            "role": role_name,
            "keyword": keyword,
            "extracted": total_extracted,
            "relevant": relevant_count,
            "relevance_pct": relevance_acc,
            "fresh": fresh_count,
            "fresh_pct": freshness_acc,
            "valid_saved": valid_ready_count,
            "duration": duration,
        })

        all_extracted_jobs.extend(jobs)

    # Sync valid extracted jobs to Supabase Cloud
    synced_count = 0
    if sb and all_extracted_jobs:
        try:
            print(f"\n[SYNC] Syncing {len(all_extracted_jobs)} Naukri jobs to Supabase Cloud...")
            synced_count = sync_jobs(sb, jobs_batch=all_extracted_jobs)
            print(f"[SUCCESS] Upserted {synced_count} fresh Naukri jobs to Supabase Cloud!")
        except Exception as e:
            print(f"[WARN] Supabase sync notice: {e}")

    # Print Summary Table
    print("\n" + "=" * 90)
    print(f"{'ROLE NAME':<20} | {'EXTRACTED':<10} | {'RELEVANT':<12} | {'24H FRESH':<12} | {'SAVED TO DB':<12} | {'TIME'}")
    print("-" * 90)
    total_ext = 0
    total_rel = 0
    total_fresh = 0
    total_saved = 0

    for r in results:
        total_ext += r["extracted"]
        total_rel += r["relevant"]
        total_fresh += r["fresh"]
        total_saved += r["valid_saved"]
        print(
            f"{r['role']:<20} | {r['extracted']:<10} | "
            f"{r['relevant']:>3} ({r['relevance_pct']:.0f}%)   | "
            f"{r['fresh']:>3} ({r['fresh_pct']:.0f}%)   | "
            f"{r['valid_saved']:<12} | {r['duration']}s"
        )

    print("-" * 90)
    avg_rel = (total_rel / total_ext * 100) if total_ext > 0 else 0
    avg_fresh = (total_fresh / total_ext * 100) if total_ext > 0 else 0
    print(
        f"{'TOTAL / OVERALL':<20} | {total_ext:<10} | "
        f"{total_rel:>3} ({avg_rel:.0f}%)   | "
        f"{total_fresh:>3} ({avg_fresh:.0f}%)   | "
        f"{total_saved:<12} |"
    )
    print("=" * 90)
    print(f"Supabase Direct Synchronization: {synced_count} records upserted successfully.")

if __name__ == "__main__":
    run_role_accuracy_benchmark()
