"""
Backfill script to enrich existing jobs in Data/unified_jobs.csv with full descriptions and degrees.
Fetches full detail pages for listings that currently have short card snippets or missing descriptions.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import pandas as pd
from database import import_csv_to_database, DB_PATH
from scrapers.naukri.scraper import fetch_page as fetch_naukri_page, enrich_job_from_detail as enrich_naukri_detail
from scrapers.linkedin.scraper import enrich_job as enrich_linkedin_job
from pipeline.enrichment import enrich_job
from pipeline.schema import UnifiedJob


def backfill_jobs(max_items: int = 15):
    csv_path = ROOT_DIR / "Data" / "unified_jobs.csv"
    if not csv_path.exists():
        print(f"[Error] File not found: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    print(f"Total jobs in CSV: {len(df)}")
    
    # Identify jobs needing full description
    mask = (
        (df['source'].str.lower() == 'naukri') & (
            df['full_description'].isna() |
            (df['full_description'] == 'Not Specified') |
            (df['full_description'].str.len() < 250)
        )
    )
    candidates = df[mask]
    print(f"Jobs with short/missing description: {len(candidates)}")

    updated_count = 0
    for idx, row in candidates.head(max_items).iterrows():
        link = str(row.get('link', '')).strip()
        source = str(row.get('source', '')).strip()
        title = str(row.get('title', '')).strip()

        if not link or link in {'Not Specified', 'nan'}:
            continue

        print(f"\n[{idx}] Fetching detail for: {title} ({source})")
        print(f"     URL: {link[:80]}...")

        job_dict = row.to_dict()
        enriched = False

        if "naukri" in source.lower() or "naukri.com" in link.lower():
            try:
                resp = fetch_naukri_page(link, headless=True)
                if resp:
                    job_dict = enrich_naukri_detail(job_dict, resp)
                    enriched = True
            except Exception as e:
                print(f"     [Naukri error]: {e}")

        elif "linkedin" in source.lower() or "linkedin.com" in link.lower():
            try:
                # LinkedIn enrichment
                enrich_linkedin_job(job_dict)
                enriched = True
            except Exception as e:
                print(f"     [LinkedIn error]: {e}")

        if enriched:
            desc = str(job_dict.get('full_description', '')).strip()
            deg = str(job_dict.get('degree_required', '')).strip()
            if len(desc) > 250 or (deg and deg != 'Not Specified'):
                df.at[idx, 'full_description'] = desc
                if deg and deg != 'Not Specified':
                    df.at[idx, 'degree_required'] = deg
                updated_count += 1
                print(f"     ==> Enriched! Desc length: {len(desc)}, Degree: {df.at[idx, 'degree_required']}")
            else:
                print(f"     ==> Fetched but no extra description found.")

        time.sleep(1)

    print(f"\n==========================================")
    print(f"Backfill batch complete! Updated {updated_count} jobs.")
    print(f"==========================================")

    if updated_count > 0:
        # Re-enrich with ML predictor to populate missing fields
        from ml.ml_predictor import predict_degree, predict_specialization
        for i, r in df.iterrows():
            d = str(r.get('degree_required', '')).strip()
            fdesc = str(r.get('full_description', '')).strip()
            if (not d or d == 'Not Specified') and len(fdesc) > 50:
                pred = predict_degree(fdesc)
                if pred and pred != 'Not Specified':
                    df.at[i, 'degree_required'] = pred

        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        import_csv_to_database(csv_path)
        print("Updated CSV and synchronized SQLite database!")


if __name__ == "__main__":
    backfill_jobs(max_items=50)
