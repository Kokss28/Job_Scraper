import csv
import sqlite3
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from config import (
    OUTPUT_DIR,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    IS_SUPABASE_CONFIGURED,
)


# ============================================================
# CONFIGURATION
#
# CSV_PATH / DB_PATH are derived from config.OUTPUT_DIR so that
# this script always targets the same output directory as
# main.py (respecting the PIPELINE_OUTPUT_DIR environment
# variable / .env setting). Do not hardcode "Data" here
# again — that previously caused this script to silently sync
# the wrong files whenever PIPELINE_OUTPUT_DIR was customized.
# ============================================================

CSV_PATH = OUTPUT_DIR / "unified_jobs.csv"
DB_PATH = OUTPUT_DIR / "jobs.db"


# ============================================================
# DATABASE SCHEMA
# ============================================================

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    source TEXT,
    title TEXT,
    company TEXT,
    search_keyword TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    min_experience_years TEXT,
    max_experience_years TEXT,
    experience_review TEXT,
    skills TEXT,
    degree_required TEXT,
    specialization_required TEXT,
    collected_at TEXT,
    link TEXT,
    full_description TEXT
)
"""


# ============================================================
# DATABASE CONNECTION
# ============================================================

def create_database():

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DB_PATH)

    cursor = connection.cursor()

    cursor.execute(CREATE_TABLE_SQL)

    # ============================================================
    # SCHEMA MIGRATION
    #
    # CREATE TABLE IF NOT EXISTS does nothing if jobs.db already
    # exists from before a schema change (e.g. an older database
    # that predates the search_keyword column). Add any missing
    # columns so old databases keep working without the user
    # needing to delete anything.
    # ============================================================

    cursor.execute("PRAGMA table_info(jobs)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    expected_columns = [
        "job_id", "source", "title", "company", "search_keyword",
        "city", "state", "country", "min_experience_years",
        "max_experience_years", "experience_review", "skills", "degree_required",
        "specialization_required", "collected_at", "link",
        "full_description",
    ]

    for column in expected_columns:
        if column not in existing_columns:
            print(f"[SQLite] Migrating existing database: adding missing column '{column}'")
            cursor.execute(f"ALTER TABLE jobs ADD COLUMN {column} TEXT")

    connection.commit()

    return connection


# ============================================================
# IMPORT CSV → SQLITE
# ============================================================

def import_csv_to_database(target_csv=None):

    csv_file = Path(target_csv) if target_csv else CSV_PATH

    if not csv_file.exists():
        print(f"[ERROR] CSV file not found: {csv_file}")
        return

    print("=" * 70)
    print("CSV -> SQLITE DATABASE IMPORT")
    print("=" * 70)

    print(f"CSV: {csv_file}")
    print(f"Database: {DB_PATH}")
    print()

    connection = create_database()
    cursor = connection.cursor()

    inserted = 0
    updated = 0
    skipped = 0

    cursor.execute(
        "CREATE TEMP TABLE sync_job_ids (job_id TEXT PRIMARY KEY)"
    )

    with open(
        csv_file,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            job_id = (row.get("job_id") or "").strip()

            if not job_id:
                skipped += 1
                continue

            cursor.execute(
                "INSERT OR IGNORE INTO sync_job_ids (job_id) VALUES (?)",
                (job_id,),
            )

            values = (
                job_id,
                row.get("source", "Not Specified"),
                row.get("title", "Not Specified"),
                row.get("company", "Not Specified"),
                row.get("search_keyword", "Not Specified"),
                row.get("city", "Not Specified"),
                row.get("state", "Not Specified"),
                row.get("country", "Not Specified"),
                row.get("min_experience_years", "Not Specified"),
                row.get("max_experience_years", "Not Specified"),
                row.get("experience_review", ""),
                row.get("skills", "Not Specified"),
                row.get("degree_required", "Not Specified"),
                row.get("specialization_required", "Not Specified"),
                row.get("collected_at", "Not Specified"),
                row.get("link", "Not Specified"),
                row.get("full_description", "Not Specified"),
            )

            cursor.execute(
                """
                INSERT INTO jobs (
                    job_id,
                    source,
                    title,
                    company,
                    search_keyword,
                    city,
                    state,
                    country,
                    min_experience_years,
                    max_experience_years,
                    experience_review,
                    skills,
                    degree_required,
                    specialization_required,
                    collected_at,
                    link,
                    full_description
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

                ON CONFLICT(job_id)
                DO UPDATE SET
                    source = excluded.source,
                    title = excluded.title,
                    company = excluded.company,
                    search_keyword = excluded.search_keyword,
                    city = excluded.city,
                    state = excluded.state,
                    country = excluded.country,
                    min_experience_years = excluded.min_experience_years,
                    max_experience_years = excluded.max_experience_years,
                    experience_review = excluded.experience_review,
                    skills = excluded.skills,
                    degree_required = excluded.degree_required,
                    specialization_required = excluded.specialization_required,
                    collected_at = excluded.collected_at,
                    link = excluded.link,
                    full_description = excluded.full_description
                """,
                values
            )

            if cursor.rowcount == 1:
                inserted += 1
            else:
                updated += 1

    cursor.execute(
        """
        DELETE FROM jobs
        WHERE NOT EXISTS (
            SELECT 1
            FROM sync_job_ids
            WHERE sync_job_ids.job_id = jobs.job_id
        )
        """
    )

    connection.commit()

    # ========================================================
    # CREATE INDEXES
    # ========================================================

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source)"
    )

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company)"
    )

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city)"
    )

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title)"
    )

    connection.commit()

    # ========================================================
    # DATABASE SUMMARY
    # ========================================================

    cursor.execute("SELECT COUNT(*) FROM jobs")

    total_jobs = cursor.fetchone()[0]

    cursor.execute(
        "SELECT source, COUNT(*) FROM jobs GROUP BY source"
    )

    source_counts = cursor.fetchall()

    connection.close()

    print()
    print("=" * 70)
    print("SQLITE IMPORT COMPLETE")
    print("=" * 70)

    print(f"Rows processed : {inserted + updated + skipped}")
    print(f"Skipped        : {skipped}")
    print(f"Total jobs DB  : {total_jobs}")

    print()
    print("Jobs by source:")

    for source, count in source_counts:
        print(f"  {source}: {count}")

    print()
    print(f"SQLite database: {DB_PATH}")
    print("=" * 70)


# ============================================================
# SUPABASE HELPERS & SYNC (Option A)
# ============================================================

def get_supabase_client():
    """
    Returns an authenticated Supabase client using SUPABASE_SERVICE_ROLE_KEY.
    Returns None if Supabase credentials are not configured or SDK is missing.
    """
    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        return None

    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except ImportError:
        print("[Supabase] Notice: 'supabase' package is not installed. Run: pip install supabase")
        return None
    except Exception as e:
        print(f"[Supabase] Error initializing client: {e}")
        return None


def clean_job_record(row: dict) -> dict:
    """
    Standardize a CSV row into a clean dictionary ready for Supabase upsert.
    Ensures all expected database schema columns exist and defaults are applied.
    """
    return {
        "job_id": (row.get("job_id") or "").strip(),
        "source": row.get("source") or "Not Specified",
        "title": row.get("title") or "Not Specified",
        "company": row.get("company") or "Not Specified",
        "search_keyword": row.get("search_keyword") or "Not Specified",
        "city": row.get("city") or "Not Specified",
        "state": row.get("state") or "Not Specified",
        "country": row.get("country") or "Not Specified",
        "min_experience_years": str(row.get("min_experience_years") or "Not Specified"),
        "max_experience_years": str(row.get("max_experience_years") or "Not Specified"),
        "experience_review": row.get("experience_review") or "",
        "skills": row.get("skills") or "Not Specified",
        "degree_required": row.get("degree_required") or "Not Specified",
        "specialization_required": row.get("specialization_required") or "Not Specified",
        "collected_at": row.get("collected_at") or "Not Specified",
        "link": row.get("link") or "Not Specified",
        "full_description": row.get("full_description") or "Not Specified",
    }


def sync_csv_to_supabase(target_csv=None, batch_size=100) -> dict:
    """
    Batch upsert unified_jobs.csv to Supabase Cloud using Option A (REST SDK).

    Returns:
        dict: {'synced': int, 'skipped': int, 'status': str}
    """
    client = get_supabase_client()
    if not client:
        print("[Supabase] Skipped: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured in .env")
        return {"synced": 0, "skipped": 0, "status": "unconfigured"}

    csv_file = Path(target_csv) if target_csv else CSV_PATH

    if not csv_file.exists():
        print(f"[Supabase] ERROR: CSV file not found: {csv_file}")
        return {"synced": 0, "skipped": 0, "status": "file_not_found"}

    print("=" * 70)
    print("CSV -> SUPABASE DATABASE SYNC (Option A)")
    print("=" * 70)
    print(f"CSV source  : {csv_file}")
    print(f"Target      : {SUPABASE_URL}")
    print(f"Batch size  : {batch_size}")
    print()

    batch = []
    total_synced = 0
    skipped = 0

    with open(csv_file, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            record = clean_job_record(row)
            if not record["job_id"]:
                skipped += 1
                continue

            batch.append(record)

            if len(batch) >= batch_size:
                try:
                    client.table("jobs").upsert(batch, on_conflict="job_id").execute()
                    total_synced += len(batch)
                    print(f"  [Supabase] Upserted {total_synced} jobs...")
                except Exception as e:
                    print(f"  [Supabase] Error uploading batch: {e}")
                    raise
                batch.clear()

        if batch:
            try:
                client.table("jobs").upsert(batch, on_conflict="job_id").execute()
                total_synced += len(batch)
                print(f"  [Supabase] Upserted final batch. Total: {total_synced} jobs.")
            except Exception as e:
                print(f"  [Supabase] Error uploading final batch: {e}")
                raise

    print()
    print("=" * 70)
    print("SUPABASE SYNC COMPLETE")
    print("=" * 70)
    print(f"Total upserted : {total_synced}")
    print(f"Skipped rows   : {skipped}")
    print("=" * 70)
    return {"synced": total_synced, "skipped": skipped, "status": "success"}


def sync_all(target_csv=None):
    """
    Convenience method: Syncs to SQLite first, and if Supabase is configured,
    syncs to Supabase Cloud as well.
    """
    import_csv_to_database(target_csv)
    if IS_SUPABASE_CONFIGURED:
        print()
        sync_csv_to_supabase(target_csv)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Sync scraped jobs CSV to SQLite and/or Supabase Cloud."
    )
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Path to unified_jobs.csv (defaults to config.OUTPUT_DIR/unified_jobs.csv)",
    )
    parser.add_argument(
        "--target",
        choices=["all", "sqlite", "supabase"],
        default="all",
        help="Database target to sync to: all (default), sqlite, or supabase",
    )
    args = parser.parse_args()

    if args.target == "sqlite":
        import_csv_to_database(args.csv)
    elif args.target == "supabase":
        sync_csv_to_supabase(args.csv)
    else:
        sync_all(args.csv)
