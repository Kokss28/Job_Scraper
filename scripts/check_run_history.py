import urllib.request
import json
from datetime import datetime, timezone, timedelta

u = "https://api.github.com/repos/Pravink1005/Job_Scraper/actions/runs?per_page=20"
req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
res = json.loads(urllib.request.urlopen(req).read().decode())
runs = res.get("workflow_runs", [])

print(f"Total Runs Recorded in Repository: {len(runs)}\n")
print(f"{'Run ID':<14} | {'Event':<18} | {'Status':<12} | {'UTC Time':<22} | {'India Time (IST)':<24} | {'Gap Since Last Run'}")
print("-" * 115)

prev_time = None
# Show in chronological order
for r in reversed(runs):
    created_str = r["created_at"].replace("Z", "+00:00")
    dt_utc = datetime.fromisoformat(created_str)
    # India is UTC + 5:30
    dt_ist = dt_utc + timedelta(hours=5, minutes=30)
    ist_str = dt_ist.strftime("%Y-%m-%d %I:%M:%S %p")
    gap = f"{((dt_utc - prev_time).total_seconds() / 3600):.2f} hours" if prev_time else "Baseline (Start)"
    prev_time = dt_utc
    status = r.get("conclusion") or r.get("status")
    print(f"{r['id']:<14} | {r['event']:<18} | {status:<12} | {r['created_at']:<22} | {ist_str:<24} | {gap}")
