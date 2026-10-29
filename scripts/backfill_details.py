"""
Direct Database Backfill Script for Supabase Cloud and Local Stores.
Directly queries the database for 'Not Specified' job descriptions and enriches them in real-time.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

# Fix terminal encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import pandas as pd
from database import import_csv_to_database, get_supabase_client
from scrapers.naukri.scraper import fetch_page as fetch_naukri_page, enrich_job_from_detail as enrich_naukri_detail
from scrapers.linkedin.scraper import enrich_job as enrich_linkedin_job
from ml.ml_predictor import predict_degree, predict_specialization
from pipeline.normalizer import _extract_skills_from_text, _extract_experience_range


def backfill_direct_from_supabase(
    max_items: int = 100,
    source_filter: str = "linkedin",
    delay_sec: float = 0.5,
):
    supabase = get_supabase_client()
    if not supabase:
        print("[Error] Supabase client could not be initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
        return

    print("=" * 70)
    print("DIRECT SUPABASE CLOUD BACKFILL")
    print("=" * 70)

    # Count total 'Not Specified' in Supabase
    count_query = supabase.table("jobs").select("count", count="exact").eq("full_description", "Not Specified")
    if source_filter and source_filter.lower() != "all":
        count_query = count_query.ilike("source", source_filter)
    total_missing = count_query.execute().count or 0

    print(f"Total jobs with 'Not Specified' in Supabase ({source_filter}): {total_missing}")
    if total_missing == 0:
        print("No missing descriptions in Supabase! Everything is up to date.")
        return

    fetch_limit = total_missing if max_items <= 0 else min(max_items, total_missing)
    print(f"Fetching batch of {fetch_limit} jobs from Supabase...")

    # Fetch rows from Supabase
    data_query = (
        supabase.table("jobs")
        .select("job_id, source, title, company, link, degree_required, specialization_required, skills, min_experience_years, max_experience_years")
        .eq("full_description", "Not Specified")
    )
    if source_filter and source_filter.lower() != "all":
        data_query = data_query.ilike("source", source_filter)

    # Supabase default max limit per query is 1000
    rows = data_query.limit(min(fetch_limit, 1000)).execute().data or []
    print(f"Retrieved {len(rows)} records from Supabase. Starting enrichment (Delay: {delay_sec}s)...\n")

    updated_count = 0
    failed_count = 0
    updated_records = []

    for step, r in enumerate(rows, start=1):
        job_id = r.get("job_id")
        link = str(r.get("link", "") or "").strip()
        source = str(r.get("source", "") or "").strip()
        title = str(r.get("title", "") or "").strip()

        if not link or link in {"Not Specified", "nan", "None"}:
            print(f"[{step}/{len(rows)}] ⚠️ Skipping (no URL): {title[:35]} | {source}")
            failed_count += 1
            continue

        job_dict = {
            "job_id": job_id,
            "job_url": link,
            "link": link,
            "job_title": title,
            "title": title,
            "source": source,
        }

        desc_text = ""
        enriched = False

        try:
            if "linkedin" in source.lower() or "linkedin.com" in link.lower():
                job_dict = enrich_linkedin_job(job_dict)
                desc_text = (
                    job_dict.get("full_description")
                    or job_dict.get("job_description")
                    or ""
                ).strip()
                if desc_text and desc_text != "Not Specified":
                    enriched = True

            elif "naukri" in source.lower() or "naukri.com" in link.lower():
                resp = fetch_naukri_page(link, headless=True)
                if resp:
                    job_dict = enrich_naukri_detail(job_dict, resp)
                    desc_text = (
                        job_dict.get("full_description")
                        or job_dict.get("job_description")
                        or ""
                    ).strip()
                    if desc_text and desc_text != "Not Specified":
                        enriched = True
        except Exception as exc:
            print(f"[{step}/{len(rows)}] ⚠️ Fetch error on {title[:35]}: {exc}")

        if enriched and len(desc_text) >= 100:
            payload = {
                "full_description": desc_text,
            }

            # Enrich missing degree if needed
            curr_deg = str(r.get("degree_required", "") or "").strip()
            if not curr_deg or curr_deg == "Not Specified":
                pred_deg = predict_degree(desc_text)
                if pred_deg and pred_deg != "Not Specified":
                    payload["degree_required"] = pred_deg

            # Enrich missing specialization if needed
            curr_spec = str(r.get("specialization_required", "") or "").strip()
            if not curr_spec or curr_spec == "Not Specified":
                pred_spec = predict_specialization(desc_text)
                if pred_spec and pred_spec != "Not Specified":
                    payload["specialization_required"] = pred_spec

            # Enrich missing skills if needed
            curr_skills = str(r.get("skills", "") or "").strip()
            if not curr_skills or curr_skills == "Not Specified":
                found_skills = _extract_skills_from_text(desc_text)
                if found_skills and found_skills != "Not Specified":
                    payload["skills"] = found_skills

            # Enrich missing experience if needed
            curr_min = str(r.get("min_experience_years", "") or "").strip()
            if not curr_min or curr_min in {"Not Specified", "nan", "None"}:
                min_exp, max_exp = _extract_experience_range(job_dict, desc_text)
                if min_exp != "Not Specified":
                    payload["min_experience_years"] = str(min_exp)
                    payload["max_experience_years"] = str(max_exp)

            # Update Supabase directly
            try:
                supabase.table("jobs").update(payload).eq("job_id", job_id).execute()
                updated_count += 1
                updated_records.append((job_id, payload))
                print(
                    f"[{step}/{len(rows)}] ✅ Supabase Updated ({len(desc_text)} chars): {title[:35]} | {source}"
                )
            except Exception as sb_err:
                print(f"[{step}/{len(rows)}] ⚠️ Supabase Update Failed: {sb_err}")
                failed_count += 1
        else:
            failed_count += 1
            print(f"[{step}/{len(rows)}] ℹ️ No detail found: {title[:35]} | {source}")

        if delay_sec > 0:
            time.sleep(delay_sec)

    print("\n" + "=" * 70)
    print(f"SUPABASE BACKFILL COMPLETE: {updated_count} enriched & updated in Supabase Cloud, {failed_count} skipped/failed.")
    print("=" * 70)

    # Sync local CSV and SQLite if updated
    if updated_records:
        csv_path = ROOT_DIR / "Data" / "unified_jobs.csv"
        if csv_path.exists():
            try:
                df = pd.read_csv(csv_path)
                id_map = {uid: p for uid, p in updated_records}
                for i, row in df.iterrows():
                    jid = row.get("job_id")
                    if jid in id_map:
                        p = id_map[jid]
                        if "full_description" in p:
                            df.at[i, "full_description"] = p["full_description"]
                        if "degree_required" in p:
                            df.at[i, "degree_required"] = p["degree_required"]
                        if "skills" in p:
                            df.at[i, "skills"] = p["skills"]
                        if "min_experience_years" in p:
                            df.at[i, "min_experience_years"] = p["min_experience_years"]
                        if "max_experience_years" in p:
                            df.at[i, "max_experience_years"] = p["max_experience_years"]

                df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                import_csv_to_database(csv_path)
                print("✓ Also synchronized matching local CSV & SQLite entries.")
            except Exception as e:
                print(f"Notice: Local CSV update note: {e}")


def main():
    parser = argparse.ArgumentParser(description="Backfill missing job descriptions directly from Supabase Cloud")
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Max jobs to process (default: 50. Use 0 for ALL missing)",
    )
    parser.add_argument(
        "--source",
        type=str,
        default="linkedin",
        help="Target source (linkedin, naukri, or all. Default: linkedin)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay between requests in seconds (default: 0.5s)",
    )

    args = parser.parse_args()
    backfill_direct_from_supabase(
        max_items=args.limit,
        source_filter=args.source,
        delay_sec=args.delay,
    )


if __name__ == "__main__":
    main()
