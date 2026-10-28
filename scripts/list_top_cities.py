import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

conn = sqlite3.connect("data/jobs.db")
cursor = conn.cursor()
cursor.execute("SELECT city, COUNT(*) FROM jobs GROUP BY city ORDER BY COUNT(*) DESC LIMIT 30")
print("Top 30 cities in SQLite:")
for r in cursor.fetchall():
    print(f"  {r[0]}: {r[1]}")
conn.close()

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if supabase_url and supabase_key:
    from supabase import create_client
    sb = create_client(supabase_url, supabase_key)
    res = sb.table("jobs").select("city").execute()
    jobs = res.data or []
    counts = {}
    for j in jobs:
        c = j.get("city") or "Not Specified"
        counts[c] = counts.get(c, 0) + 1
    print(f"\nTop 30 cities in Supabase ({len(jobs)} total jobs):")
    for c, cnt in sorted(counts.items(), key=lambda x: -x[1])[:30]:
        print(f"  {c}: {cnt}")
