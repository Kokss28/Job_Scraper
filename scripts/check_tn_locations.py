import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

db_path = "data/jobs.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("Tables in data/jobs.db:", tables)
    
    table_name = tables[0][0] if tables else "jobs"
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    print(f"Total rows in {table_name}:", cursor.fetchone()[0])

    cursor.execute(f"""
        SELECT location, normalized_location, city, state 
        FROM {table_name} 
        WHERE LOWER(COALESCE(location, '')) LIKE '%hosur%' 
           OR LOWER(COALESCE(location, '')) LIKE '%trichy%' 
           OR LOWER(COALESCE(location, '')) LIKE '%tiruch%' 
           OR LOWER(COALESCE(location, '')) LIKE '%tirup%'
           OR LOWER(COALESCE(location, '')) LIKE '%salem%'
           OR LOWER(COALESCE(location, '')) LIKE '%madurai%'
           OR LOWER(COALESCE(city, '')) LIKE '%hosur%' 
           OR LOWER(COALESCE(city, '')) LIKE '%trichy%' 
           OR LOWER(COALESCE(city, '')) LIKE '%tiruch%' 
           OR LOWER(COALESCE(city, '')) LIKE '%tirup%'
           OR LOWER(COALESCE(city, '')) LIKE '%salem%'
           OR LOWER(COALESCE(city, '')) LIKE '%madurai%'
    """)
    rows = cursor.fetchall()
    print(f"\nMatching rows in sqlite ({len(rows)}):")
    for r in rows:
        print(" ", r)
    conn.close()

# Also query Supabase if available
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if supabase_url and supabase_key:
    from supabase import create_client
    sb = create_client(supabase_url, supabase_key)
    res = sb.table("jobs").select("location, normalized_location, city, state").execute()
    jobs = res.data or []
    print(f"\nTotal jobs in Supabase: {len(jobs)}")
    matched_sb = []
    for j in jobs:
        loc = (j.get("location") or "") + " " + (j.get("normalized_location") or "") + " " + (j.get("city") or "")
        loc_l = loc.lower()
        if any(k in loc_l for k in ["hosur", "trichy", "tiruch", "tirup", "salem", "madurai"]):
            matched_sb.append(j)
    print(f"Matching rows in Supabase ({len(matched_sb)}):")
    for m in matched_sb:
        print(" ", m)
