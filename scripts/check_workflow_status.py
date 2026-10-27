import urllib.request
import json
from datetime import datetime, timezone, timedelta

workflows = [
    (398020999, "1. Harvest - Data & Analytics"),
    (398021009, "2. Harvest - Python Development"),
    (398021005, "3. Harvest - Java Development"),
    (398020997, "4. Harvest - Cloud & DevOps"),
]

for wid, name in workflows:
    u = f"https://api.github.com/repos/Kokss28/Job_Scraper/actions/workflows/{wid}/runs"
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
    res = json.loads(urllib.request.urlopen(req).read().decode())
    total = res.get("total_count", 0)
    print(f"\n{name} (ID: {wid}): {total} runs")
    for r in res.get("workflow_runs", [])[:3]:
        created_utc = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
        created_ist = created_utc + timedelta(hours=5, minutes=30)
        print(f"  Run #{r['id']} | Event: {r['event']} | Status: {r['status']} | Result: {r['conclusion']} | Time (IST): {created_ist.strftime('%Y-%m-%d %I:%M:%S %p')}")
