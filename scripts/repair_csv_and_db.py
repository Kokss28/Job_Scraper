"""
Repair script to align CSV headers and fix shifted columns in Data/unified_jobs.csv and Data/jobs.db.
"""

from __future__ import annotations

import csv
import shutil
import sqlite3
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from pipeline.schema import CSV_FIELDS
CSV_PATH = ROOT_DIR / "Data" / "unified_jobs.csv"
BACKUP_PATH = ROOT_DIR / "Data" / "unified_jobs.backup.csv"
DB_PATH = ROOT_DIR / "Data" / "jobs.db"


def main():
    if not CSV_PATH.exists():
        print("CSV file not found:", CSV_PATH)
        return

    # Backup original
    shutil.copyfile(CSV_PATH, BACKUP_PATH)
    print(f"Backed up CSV to {BACKUP_PATH}")

    rows = []
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        old_header = next(reader)
        for r in reader:
            if not r or not r[0].strip():
                continue
            # Shifted row detection
            if len(r) >= 17 and ("202" in r[14] or "T" in r[14]) and "http" in r[15]:
                fixed_dict = {
                    "job_id": r[0],
                    "source": r[1],
                    "title": r[2],
                    "company": r[3],
                    "search_keyword": r[4],
                    "city": r[5],
                    "state": r[6],
                    "country": r[7],
                    "min_experience_years": r[8],
                    "max_experience_years": r[9],
                    "experience_review": r[10] if r[10] != "Not Specified" else "",
                    "skills": r[11],
                    "degree_required": r[12],
                    "specialization_required": r[13],
                    "collected_at": r[14],
                    "link": r[15],
                    "full_description": r[16],
                }
                rows.append(fixed_dict)
            else:
                d = dict(zip(old_header, r))
                fixed_dict = {f: d.get(f, "Not Specified") for f in CSV_FIELDS}
                if fixed_dict.get("experience_review") == "Not Specified":
                    fixed_dict["experience_review"] = ""
                rows.append(fixed_dict)

    print(f"Repaired {len(rows)} rows. Writing canonical CSV...")

    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Saved {CSV_PATH} with canonical headers matching CSV_FIELDS.")

    # Re-import cleanly into SQLite
    from database import import_csv_to_database
    import_csv_to_database()
    print("Database re-import completed successfully!")


if __name__ == "__main__":
    main()
