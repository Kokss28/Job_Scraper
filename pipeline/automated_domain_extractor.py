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


def log(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}", flush=True)


def get_slot_for_hour(hour: int) -> Dict[str, Any]:
    """Returns the domain config for a given hour using modulo 4."""
    slot_index = hour % 4
    return DOMAIN_SLOTS[slot_index]


def execute_extraction(
    domain_config: Dict[str, Any],
    sources: str = "LinkedIn,Naukri,Indeed",
    location: str = "India",
    dry_run: bool = False,
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

    if dry_run:
        log("  [DRY-RUN] Simulating execution only. No network calls dispatched.")
        log("=" * 78)
        return 0

    cmd = [
        sys.executable,
        str(ROOT_DIR / "pipeline" / "live_scrape_runner.py"),
        "--sources",
        sources,
        "--keywords",
        keywords,
        "--freshness",
        str(freshness),
        "--location",
        location,
        # NOTE: --max-jobs is intentionally omitted so there is NO limit
    ]

    log(f"Dispatching runner: {' '.join(cmd)}")
    start_time = time.time()
    try:
        proc = subprocess.run(cmd, cwd=str(ROOT_DIR), check=True)
        duration = time.time() - start_time
        log(f"Extraction for '{name}' completed successfully in {duration:.1f}s.")
        return proc.returncode
    except subprocess.CalledProcessError as err:
        log(f"Extraction for '{name}' exited with error code {err.returncode}")
        return err.returncode
    except Exception as exc:
        log(f"Unexpected error running extraction: {exc}")
        return 1


def run_daemon_loop(sources: str = "LinkedIn,Naukri,Indeed", location: str = "India"):
    """Runs continuously, cycling through domains 0 -> 1 -> 2 -> 3 -> 0 ... every hour."""
    log("Starting Continuous 24/7 Automated Rolling Domain Scraper...")
    log("Cycle: Data Analytics (Hr 1) -> Python (Hr 2) -> Java (Hr 3) -> Cloud (Hr 4) -> Repeat")
    log("Press Ctrl+C to terminate the daemon at any time.\n")

    while True:
        now = datetime.now()
        domain_config = get_slot_for_hour(now.hour)
        log(f"Clock time: {now.strftime('%H:%M:%S')} (Hour {now.hour}) -> Matched to Slot {domain_config['slot']}: {domain_config['name']}")

        execute_extraction(domain_config, sources=sources, location=location)

        next_slot = (domain_config["slot"] + 1) % 4
        next_domain = DOMAIN_SLOTS[next_slot]
        log(f"Sleeping 1 Hour (3600s). Next domain in queue: Slot {next_slot} ({next_domain['name']})...\n")
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

    args = parser.parse_args()

    if args.daemon:
        run_daemon_loop(sources=args.sources, location=args.location)
        return

    # Determine target slot
    selected_config: Optional[Dict[str, Any]] = None

    if args.slot is not None:
        selected_config = DOMAIN_SLOTS[args.slot]
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
        # Default: auto-detect from current clock hour
        current_hour = datetime.now().hour
        selected_config = get_slot_for_hour(current_hour)
        log(f"Auto-detected clock hour: {current_hour}:00 -> Slot {selected_config['slot']} ({selected_config['name']})")

    code = execute_extraction(
        selected_config,
        sources=args.sources,
        location=args.location,
        dry_run=args.dry_run,
    )
    sys.exit(code)


if __name__ == "__main__":
    main()
