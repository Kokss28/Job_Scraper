"""Repair Haryana location values in the project's CSV and SQLite outputs.

Run from any working directory with:

    python -m pipeline.repair_existing_data
"""

from __future__ import annotations

import csv
import shutil
import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "Data"
CSV_PATH = DATA_DIR / "unified_jobs.csv"
DB_PATH = DATA_DIR / "jobs.db"
BACKUP_CSV_PATH = DATA_DIR / "unified_jobs_backup_before_location_fix.csv"
BACKUP_DB_PATH = DATA_DIR / "jobs_backup_before_location_fix.db"

OLD_COUNTRY = "Haryana, India"
NEW_STATE = "Haryana"
NEW_COUNTRY = "India"
PLACEHOLDER = "Not Specified"


def repair_locations() -> tuple[int, int]:
    """Repair matching rows in both outputs, keeping each row's city."""
    if not CSV_PATH.is_file():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")
    if not DB_PATH.is_file():
        raise FileNotFoundError(f"SQLite database not found: {DB_PATH}")

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames:
            raise ValueError(f"CSV has no header: {CSV_PATH}")
        fieldnames = reader.fieldnames
        rows = list(reader)

    required_fields = {"job_id", "city", "state", "country"}
    missing_fields = required_fields.difference(fieldnames)
    if missing_fields:
        raise ValueError(
            "CSV is missing required columns: "
            + ", ".join(sorted(missing_fields))
        )

    repairs: list[tuple[str, str]] = []
    for row in rows:
        if (row.get("country") or "").strip() != OLD_COUNTRY:
            continue

        job_id = (row.get("job_id") or "").strip()
        if not job_id:
            raise ValueError("Cannot repair a matching CSV row without job_id")

        # Preserve the CSV city, using the placeholder only when it is empty.
        city = (row.get("city") or "").strip() or PLACEHOLDER
        row["city"] = city
        row["state"] = NEW_STATE
        row["country"] = NEW_COUNTRY
        repairs.append((job_id, city))

    temp_csv_path = CSV_PATH.with_name(f"{CSV_PATH.name}.tmp")
    try:
        with temp_csv_path.open("w", encoding="utf-8-sig", newline="") as target:
            writer = csv.DictWriter(target, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

        # Preserve both original outputs so the repair can be reversed.
        shutil.copy2(CSV_PATH, BACKUP_CSV_PATH)
        shutil.copy2(DB_PATH, BACKUP_DB_PATH)

        sqlite_fixed = 0
        with sqlite3.connect(DB_PATH) as connection:
            cursor = connection.cursor()
            columns = {
                row[1]
                for row in cursor.execute("PRAGMA table_info(jobs)").fetchall()
            }
            if not required_fields.issubset(columns):
                missing_db_fields = required_fields.difference(columns)
                raise ValueError(
                    "SQLite jobs table is missing required columns: "
                    + ", ".join(sorted(missing_db_fields))
                )

            for job_id, city in repairs:
                cursor.execute(
                    """UPDATE jobs
                       SET city = ?, state = ?, country = ?
                       WHERE job_id = ? AND country = ?""",
                    (city, NEW_STATE, NEW_COUNTRY, job_id, OLD_COUNTRY),
                )
                sqlite_fixed += cursor.rowcount

            if sqlite_fixed != len(repairs):
                raise RuntimeError(
                    "CSV and SQLite repair counts differ; "
                    f"CSV matches={len(repairs)}, SQLite matches={sqlite_fixed}. "
                    "SQLite changes were rolled back and the CSV was not replaced."
                )

        # Replace the CSV only after the SQLite transaction succeeds.
        temp_csv_path.replace(CSV_PATH)
    finally:
        if temp_csv_path.exists():
            temp_csv_path.unlink()

    print(f"CSV rows repaired: {len(repairs)}")
    print(f"SQLite rows repaired: {sqlite_fixed}")
    print(f"CSV backup: {BACKUP_CSV_PATH}")
    print(f"SQLite backup: {BACKUP_DB_PATH}")
    print("LOCATION REPAIR COMPLETE")
    return len(repairs), sqlite_fixed


if __name__ == "__main__":
    repair_locations()
