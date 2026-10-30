"""
Automated 4-Hour Rolling Domain Extractor & Cron Runner.

Defines the 4 target domains and executes rolling extractions based on the hourly schedule:
- Slot 0 (Hours 0, 4, 8, 12, 16, 20): Data & Analytics
- Slot 1 (Hours 1, 5, 9, 13, 17, 21): Python Development
- Slot 2 (Hours 2, 6, 10, 14, 18, 22): Java Development
- Slot 3 (Hours 3, 7, 11, 15, 19, 23): Cloud & DevOps

Features:
- Time window: Last 4 Hours for continuous gapless coverage.
- NO MAX JOB LIMIT: Extracts all matching jobs available within the time window.
- Auto-syncs new records to local SQLite and Supabase Cloud.
- Single-slot mode: Perfect for GitHub Actions cron or Linux/Windows cron.
- Daemon mode (--daemon): Runs continuously in the background on a local machine or server.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Configure utf-8 stdout for cross-platform compatibility
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

# Domain & Keyword Configurations Table
DOMAIN_SLOTS: List[Dict[str, Any]] = [
    {
        "slot": 0,
        "name": "Data & Analytics",
        "hours": [0, 4, 8, 12, 16, 20],
        "keywords": "data analyst, data scientist, data engineer, business analyst, power bi",
        "freshness": 4.0,
        "description": "All data-related roles, BI reporting, analytics, and data engineering",
    },
    {
        "slot": 1,
        "name": "Python Development",
        "hours": [1, 5, 9, 13, 17, 21],
        "keywords": "python developer, python backend, django developer, fastapi developer",
        "freshness": 4.0,
        "description": "Python core, backend web frameworks, APIs, and microservices",
    },
    {
        "slot": 2,
        "name": "Java Development",
        "hours": [2, 6, 10, 14, 18, 22],
        "keywords": "java developer, full stack java, spring boot developer, core java",
        "freshness": 4.0,
        "description": "Java enterprise, Spring Boot ecosystem, and Full Stack Java engineering",
    },
    {
        "slot": 3,
        "name": "Cloud & DevOps",
        "hours": [3, 7, 11, 15, 19, 23],
        "keywords": "cloud engineer, aws devops, azure engineer, kubernetes developer",
        "freshness": 4.0,
        "description": "Cloud infrastructure (AWS/Azure/GCP), CI/CD pipelines, and Kubernetes",
    },
]


STATE_FILE = ROOT_DIR / "Data" / "rolling_state.json"


def log(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}", flush=True)


def get_slot_for_hour(hour: int) -> Dict[str, Any]:
    """Returns the domain config for a given hour using modulo 4."""
    slot_index = hour % 4
    return DOMAIN_SLOTS[slot_index]


def keyword_to_slot(kw: str) -> Optional[int]:
    """Matches a search keyword string to its corresponding domain slot index (0, 1, 2, or 3)."""
    if not kw:
        return None
    import re
    kw_clean = str(kw).lower().strip()

    # 1. Exact or substring match against full slot keyword phrases
    for config in DOMAIN_SLOTS:
        slot_kws = [k.strip().lower() for k in config["keywords"].split(",")]
        for sk in slot_kws:
            if sk in kw_clean or kw_clean in sk:
                return config["slot"]

    # 2. Significant token matching (e.g. django, fastapi, kubernetes, aws, azure)
    tokens = [t.strip() for t in re.split(r"[\s,\-/]+", kw_clean) if t.strip()]
    for config in DOMAIN_SLOTS:
        slot_kws = [k.strip().lower() for k in config["keywords"].split(",")]
        for sk in slot_kws:
            sk_tokens = [t.strip() for t in re.split(r"[\s,\-/]+", sk) if t.strip()]
            for t in tokens:
                if t in ("developer", "engineer", "analyst", "lead", "senior", "jr", "sr", "backend", "full", "stack"):
                    continue
                if t in sk_tokens:
                    return config["slot"]
    return None


def detect_last_harvested_slot() -> Optional[int]:
    """
    Checks Supabase Cloud and local state to identify the domain slot executed most recently.
    """
    # 1. Try querying Supabase Cloud for the most recent jobs' search_keyword
    try:
        from dotenv import load_dotenv
        load_dotenv(ROOT_DIR / ".env")
        sb_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        sb_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if sb_url and sb_key and not sb_key.startswith("your_"):
            from supabase import create_client
            client = create_client(sb_url, sb_key)
            res = client.table("jobs").select("search_keyword, created_at").order("created_at", desc=True).limit(25).execute()
            if res.data:
                for r in res.data:
                    slot = keyword_to_slot(r.get("search_keyword"))
                    if slot is not None:
                        log(f"Supabase recent job keyword '{r.get('search_keyword')}' matches completed Slot {slot} ({DOMAIN_SLOTS[slot]['name']})")
                        return slot
    except Exception as exc:
        log(f"Supabase state check note: {exc}")

    # 2. Fallback to local state file
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                last_slot = data.get("last_completed_slot")
                if last_slot is not None and 0 <= last_slot <= 3:
                    log(f"Local state file matches completed Slot {last_slot} ({DOMAIN_SLOTS[last_slot]['name']})")
                    return last_slot
        except Exception:
            pass

    return None


def save_completed_slot(slot: int):
    """Persists the completed slot to the local state file."""
    try:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "last_completed_slot": slot,
                "domain_name": DOMAIN_SLOTS[slot]["name"],
                "completed_at": datetime.now().isoformat(),
            }, f, indent=2)
    except Exception as e:
        log(f"Warning: Could not save state file: {e}")


def get_next_rotation_slot() -> int:
    """
    Determines next sequential slot: 0 -> 1 -> 2 -> 3 -> 0...
    If no history is found, falls back to UTC hour % 4.
    """
    last_slot = detect_last_harvested_slot()
    if last_slot is not None:
        next_slot = (last_slot + 1) % 4
        log(f"Sequential Rotation: Last completed slot was {last_slot} ({DOMAIN_SLOTS[last_slot]['name']}) -> Next slot: {next_slot} ({DOMAIN_SLOTS[next_slot]['name']})")
        return next_slot

    fallback_slot = datetime.now().hour % 4
    log(f"No prior run detected. Fallback to clock hour {datetime.now().hour} -> Slot {fallback_slot} ({DOMAIN_SLOTS[fallback_slot]['name']})")
    return fallback_slot


def execute_extraction(
    domain_config: Dict[str, Any],
    sources: str = "LinkedIn,Naukri,Indeed",
    location: str = "India",
    dry_run: bool = False,
    enable_details: bool = False,
) -> int:
    """Executes a single domain extraction without any max job limits."""
    slot = domain_config["slot"]
    name = domain_config["name"]
    keywords = domain_config["keywords"]
    freshness = domain_config["freshness"]

    log("=" * 78)
    log(f"STARTING AUTOMATED EXTRACTION: SLOT {slot} -> {name.upper()}")
    log("=" * 78)
    log(f"  • Domain: {name}")
    log(f"  • Description: {domain_config['description']}")
    log(f"  • Target Keywords: {keywords}")
    log(f"  • Recency Time Window: Last {freshness} Hours")
    log(f"  • Target Location: {location}")
    log(f"  • Sources: {sources}")
    log(f"  • Max Jobs Limit: NONE (Unlimited harvest across all accessible pages)")
    log(f"  • Fast Card Extraction: {'ENABLED (Fast ~2min)' if not enable_details else 'DISABLED (Deep ~15min)'}")

    if dry_run:
        log("  [DRY-RUN] Simulating execution only. No network calls dispatched.")
        log("=" * 78)
        return 0

    cmd = [
        sys.executable,
        str(ROOT_DIR / "pipeline" / "live_scrape_runner.py"),
        "--domain",
        name,
        "--sources",
        sources,
        "--keywords",
        keywords,
        "--freshness",
        str(freshness),
        "--location",
        location,
        # Default to fast card extraction so automated hourly cron never exceeds GitHub Actions timeout
        "--enable-details" if enable_details else "--no-details",
    ]

    log(f"Dispatching runner: {' '.join(cmd)}")
    start_time = time.time()
    try:
        proc = subprocess.run(cmd, cwd=str(ROOT_DIR), check=True)
        duration = time.time() - start_time
        log(f"Extraction for '{name}' completed successfully in {duration:.1f}s.")
        save_completed_slot(slot)

        # Dispatch automated email alert
        try:
            from pipeline.notifier import send_extraction_success_alert, send_extraction_failure_alert
            latest_csv = ROOT_DIR / "Data" / "latest_extracted_jobs.csv"
            extracted_count = 0
            by_source = {}
            sample_jobs = []
            if latest_csv.exists():
                try:
                    import pandas as pd
                    df_latest = pd.read_csv(latest_csv)
                    extracted_count = len(df_latest)
                    by_source = df_latest["source"].value_counts().to_dict()
                    sample_jobs = df_latest.head(6).to_dict(orient="records")
                except Exception:
                    pass

            if extracted_count == 0 and not dry_run:
                send_extraction_failure_alert(
                    domain_name=name,
                    slot_number=slot,
                    error_message=f"Zero jobs extracted during scheduled run for '{name}'. Check platform selectors or time window.",
                    duration_seconds=duration,
                    keywords=keywords,
                )
            else:
                clean_domain = name.replace(" ", "_").replace("&", "and")
                stamp = datetime.now().strftime("%Y%m%d_%H%M")
                att_filename = f"Jobs_{clean_domain}_{stamp}.csv"

                send_extraction_success_alert(
                    domain_name=name,
                    slot_number=slot,
                    extracted_jobs=extracted_count,
                    duration_seconds=duration,
                    by_source=by_source,
                    sample_jobs=sample_jobs,
                    freshness_hours=freshness,
                    keywords=keywords,
                    attachment_path=latest_csv if (latest_csv.exists() and extracted_count > 0) else None,
                    attachment_name=att_filename,
                )
        except Exception as notify_err:
            log(f"Notice: Email notification could not be dispatched: {notify_err}")

        return proc.returncode
    except subprocess.CalledProcessError as err:
        duration = time.time() - start_time
        log(f"Extraction for '{name}' exited with error code {err.returncode}")
        try:
            from pipeline.notifier import send_extraction_failure_alert
            send_extraction_failure_alert(
                domain_name=name,
                slot_number=slot,
                error_message=f"Extraction runner process failed with exit code {err.returncode}",
                duration_seconds=duration,
                keywords=keywords,
            )
        except Exception:
            pass
        return err.returncode
    except Exception as exc:
        duration = time.time() - start_time
        log(f"Unexpected error running extraction: {exc}")
        try:
            import traceback
            from pipeline.notifier import send_extraction_failure_alert
            send_extraction_failure_alert(
                domain_name=name,
                slot_number=slot,
                error_message=str(exc),
                traceback_text=traceback.format_exc(),
                duration_seconds=duration,
                keywords=keywords,
            )
        except Exception:
            pass
        return 1


def run_daemon_loop(sources: str = "LinkedIn,Naukri,Indeed", location: str = "India", enable_details: bool = False):
    """Runs continuously, cycling through domains 0 -> 1 -> 2 -> 3 -> 0 ... every hour."""
    log("Starting Continuous 24/7 Automated Rolling Domain Scraper...")
    log("Cycle: Data Analytics (Hr 1) -> Python (Hr 2) -> Java (Hr 3) -> Cloud (Hr 4) -> Repeat")
    log("Press Ctrl+C to terminate the daemon at any time.\n")

    while True:
        next_slot = get_next_rotation_slot()
        domain_config = DOMAIN_SLOTS[next_slot]
        log(f"Next rotation slot in queue: Slot {domain_config['slot']} ({domain_config['name']})")

        execute_extraction(domain_config, sources=sources, location=location, enable_details=enable_details)

        upcoming_slot = (domain_config["slot"] + 1) % 4
        upcoming_domain = DOMAIN_SLOTS[upcoming_slot]
        log(f"Sleeping 1 Hour (3600s). Next domain in queue: Slot {upcoming_slot} ({upcoming_domain['name']})...\n")
        try:
            time.sleep(3600)
        except KeyboardInterrupt:
            log("Daemon interrupted by user. Exiting cleanly.")
            break


def main():
    parser = argparse.ArgumentParser(description="Automated 4-Hour Rolling Domain Extractor")
    parser.add_argument(
        "--slot",
        type=int,
        choices=[0, 1, 2, 3],
        default=None,
        help="Explicitly run a specific slot (0=Data, 1=Python, 2=Java, 3=Cloud). If omitted, uses current hour.",
    )
    parser.add_argument(
        "--domain",
        type=str,
        default=None,
        help="Select slot by domain name (e.g. data, python, java, cloud).",
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Run continuously in a background loop sleeping 1 hour between slots.",
    )
    parser.add_argument(
        "--sources",
        type=str,
        default="LinkedIn,Naukri,Indeed",
        help="Comma-separated target sources (default: LinkedIn,Naukri,Indeed).",
    )
    parser.add_argument(
        "--location",
        type=str,
        default="India",
        help="Target geographic location (default: India).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show scheduled slot and keywords without executing scrapers.",
    )
    parser.add_argument(
        "--enable-details",
        action="store_true",
        default=False,
        help="Enable deep browser detail page fetching (slower, default False for automated cron).",
    )

    args = parser.parse_args()

    if args.daemon:
        run_daemon_loop(sources=args.sources, location=args.location, enable_details=args.enable_details)
        return

    # Determine target slot
    selected_config: Optional[Dict[str, Any]] = None

    if args.slot is not None:
        selected_config = DOMAIN_SLOTS[args.slot]
        log(f"Manually targeted Slot {selected_config['slot']}: {selected_config['name']}")
    elif args.domain:
        query = args.domain.strip().lower()
        for s in DOMAIN_SLOTS:
            if query in s["name"].lower() or query in s["keywords"].lower():
                selected_config = s
                break
        if not selected_config:
            log(f"Error: No domain slot matching '{args.domain}'. Options: data, python, java, cloud.")
            sys.exit(1)
    else:
        # Intelligent Sequential Rotation (Supabase Cloud + state tracker)
        next_slot_idx = get_next_rotation_slot()
        selected_config = DOMAIN_SLOTS[next_slot_idx]
        log(f"Active Rolling Slot: Slot {selected_config['slot']} -> {selected_config['name']}")

    code = execute_extraction(
        selected_config,
        sources=args.sources,
        location=args.location,
        dry_run=args.dry_run,
        enable_details=args.enable_details,
    )
    sys.exit(code)



if __name__ == "__main__":
    main()
