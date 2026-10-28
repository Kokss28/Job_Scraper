import urllib.request
import json
from datetime import datetime, timezone, timedelta

url = "https://api.github.com/repos/Pravink1005/Job_Scraper/actions/workflows/continuous_job_scraper.yml/runs?per_page=10"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        runs = data.get("workflow_runs", [])
        print(f"24/7 Rolling Job Harvester - Total Runs Recorded: {len(runs)}\n")
        print(f"{'Run ID':<14} | {'Event':<18} | {'Status':<12} | {'Result':<12} | {'Time (IST)'}")
        print("-" * 85)
        for r in runs:
            created_utc = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
            created_ist = created_utc + timedelta(hours=5, minutes=30)
            res = r.get("conclusion") or "running"
            print(f"{r['id']:<14} | {r['event']:<18} | {r['status']:<12} | {res:<12} | {created_ist.strftime('%Y-%m-%d %I:%M:%S %p')}")
except Exception as e:
    print(f"Workflow Status Query Note: {e}")
