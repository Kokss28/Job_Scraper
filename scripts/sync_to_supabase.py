"""
Quick standalone script to upload unified_jobs.csv to Supabase Cloud.

Usage:
    python scripts/sync_to_supabase.py
    python scripts/sync_to_supabase.py --csv path/to/custom.csv --batch-size 200
"""

import argparse
import sys
from pathlib import Path

# Fix terminal encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from database import sync_csv_to_supabase


def main():
    parser = argparse.ArgumentParser(
        description="Sync unified_jobs.csv to Supabase Cloud (Option A)."
    )
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Path to CSV file (defaults to Data/unified_jobs.csv)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Batch size for upserts (default: 100)",
    )
    args = parser.parse_args()

    result = sync_csv_to_supabase(target_csv=args.csv, batch_size=args.batch_size)
    if result.get("status") != "success":
        sys.exit(1)


if __name__ == "__main__":
    main()
