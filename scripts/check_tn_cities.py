import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

conn = sqlite3.connect("data/jobs.db")
cursor = conn.cursor()

cursor.execute("""
    SELECT city, COUNT(*) 
    FROM jobs 
    WHERE LOWER(COALESCE(state, '')) LIKE '%tamil%' 
       OR LOWER(COALESCE(city, '')) IN ('chennai', 'coimbatore', 'madurai', 'salem', 'hosur', 'tiruppur', 'tiruchirappalli', 'trichy', 'tirupur')
    GROUP BY city
""")
print("Tamil Nadu city counts in SQLite:")
for r in cursor.fetchall():
    print(" ", r)

cursor.execute("""
    SELECT DISTINCT city 
    FROM jobs 
    WHERE LOWER(COALESCE(city, '')) LIKE '%hosur%' 
       OR LOWER(COALESCE(city, '')) LIKE '%trichy%' 
       OR LOWER(COALESCE(city, '')) LIKE '%tiruch%' 
       OR LOWER(COALESCE(city, '')) LIKE '%tirup%'
""")
print("\nAny matches for Hosur/Trichy/Tiruppur in city column of SQLite:")
print(cursor.fetchall())

cursor.execute("""
    SELECT city, full_description 
    FROM jobs 
    WHERE LOWER(full_description) LIKE '%hosur%' 
       OR LOWER(full_description) LIKE '%trichy%' 
       OR LOWER(full_description) LIKE '%tiruchirappalli%'
       OR LOWER(full_description) LIKE '%tiruppur%'
    LIMIT 5
""")
print("\nMentions in full_description:")
for r in cursor.fetchall():
    print("  City:", r[0])

conn.close()

# Also query Supabase if available
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if supabase_url and supabase_key:
    from supabase import create_client
    sb = create_client(supabase_url, supabase_key)
    res = sb.table("jobs").select("city, state").execute()
    jobs = res.data or []
    print(f"\nTotal jobs in Supabase: {len(jobs)}")
    city_counts = {}
    for j in jobs:
        c = (j.get("city") or "").strip()
        s = (j.get("state") or "").strip()
        if "tamil" in s.lower() or c.lower() in ['chennai', 'coimbatore', 'madurai', 'salem', 'hosur', 'tiruppur', 'tiruchirappalli', 'trichy']:
            city_counts[c] = city_counts.get(c, 0) + 1
    print("Tamil Nadu city counts in Supabase:")
    for c, cnt in sorted(city_counts.items(), key=lambda x: -x[1]):
        print(f"  {c}: {cnt}")
