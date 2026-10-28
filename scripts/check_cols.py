import sqlite3

conn = sqlite3.connect("data/jobs.db")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(jobs)")
cols = cursor.fetchall()
print("Columns in jobs table:")
for c in cols:
    print(" ", c[1])

cursor.execute("SELECT * FROM jobs LIMIT 1")
row = cursor.fetchone()
print("\nSample row:")
print(row)
conn.close()
