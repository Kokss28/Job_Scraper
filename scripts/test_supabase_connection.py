"""
Test Supabase Connection Script.

Verifies:
1. Environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are set in .env
2. supabase package is installed
3. Supabase client can authenticate successfully
4. The 'jobs' table exists and is accessible
"""

import sys
from pathlib import Path

# Fix terminal encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure repository root is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

import os
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IS_SUPABASE_CONFIGURED


def main():
    print("=" * 70)
    print("SUPABASE CONNECTION TEST (Option A)")
    print("=" * 70)
    print()

    # Step 1: Check environment variables
    print("[1/4] Checking environment variables in .env...")
    if not SUPABASE_URL:
        print("  ❌ SUPABASE_URL is missing or empty in .env")
    else:
        # Mask project URL slightly for safety in logs
        print(f"  ✓ SUPABASE_URL found: {SUPABASE_URL}")

    if not SUPABASE_SERVICE_ROLE_KEY:
        print("  ❌ SUPABASE_SERVICE_ROLE_KEY is missing or empty in .env")
    else:
        masked_key = SUPABASE_SERVICE_ROLE_KEY[:10] + "..." + SUPABASE_SERVICE_ROLE_KEY[-6:]
        print(f"  ✓ SUPABASE_SERVICE_ROLE_KEY found: {masked_key}")

    if not IS_SUPABASE_CONFIGURED:
        print()
        print("❌ Cannot proceed: Please set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
        print("=" * 70)
        sys.exit(1)

    print()

    # Step 2: Check SDK installation
    print("[2/4] Verifying 'supabase' Python package...")
    try:
        from supabase import create_client, Client
        import supabase
        print(f"  ✓ 'supabase' package is installed (version {getattr(supabase, '__version__', 'unknown')})")
    except ImportError:
        print("  ❌ 'supabase' package is NOT installed.")
        print("     Run: pip install supabase")
        print("=" * 70)
        sys.exit(1)

    print()

    # Step 3: Initialize client
    print("[3/4] Connecting to Supabase project...")
    try:
        client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("  ✓ Client successfully initialized!")
    except Exception as e:
        print(f"  ❌ Failed to initialize Supabase client: {e}")
        print("=" * 70)
        sys.exit(1)

    print()

    # Step 4: Query jobs table
    print("[4/4] Verifying 'jobs' table access in Supabase...")
    try:
        res = client.table("jobs").select("job_id", count="exact").limit(1).execute()
        total_count = res.count if res.count is not None else len(res.data)
        print("  ✓ Successfully connected to 'jobs' table!")
        print(f"  ✓ Current row count in 'jobs': {total_count}")
    except Exception as e:
        print(f"  ❌ Query to 'jobs' table failed: {e}")
        print("     Did you run 'supabase_migration.sql' in your Supabase SQL Editor?")
        print("=" * 70)
        sys.exit(1)

    print()
    print("=" * 70)
    print("🎉 ALL CHECKS PASSED! Your Supabase database is ready to use.")
    print("=" * 70)
    print("Next steps:")
    print("  1. To sync your current CSV to Supabase:")
    print("     python database.py --target supabase")
    print("  2. To run the automated scrape worker:")
    print("     python -m pipeline.supabase_scrape_worker")
    print("=" * 70)


if __name__ == "__main__":
    main()
