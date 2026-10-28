import os
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if supabase_url and supabase_key:
    from supabase import create_client
    sb = create_client(supabase_url, supabase_key)
    res = sb.table("jobs").select("city, state").execute()
    jobs = res.data or []
    print(f"Total jobs: {len(jobs)}")
    
    unique_cities = {}
    for j in jobs:
        c = (j.get("city") or "Not Specified").strip()
        unique_cities[c] = unique_cities.get(c, 0) + 1
    
    print("\nAll cities with jobs in Supabase:")
    for c, cnt in sorted(unique_cities.items(), key=lambda x: -x[1]):
        print(f"  {c}: {cnt}")
