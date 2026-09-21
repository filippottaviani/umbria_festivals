import os
import psycopg2

db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/umbriafestivals')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute('SELECT count(*) FROM festivals;')
total = cur.fetchone()[0]
print(f"Total festivals in DB: {total}")

canned_patterns = [
    ("appuntamento simbolo", "description"),
    ("ricca di fascino", "description"),
    ("ritrovo festoso", "description"),
    ("generazioni di paesani", "description"),
    ("autentica convivialit", "description"),
    ("affascinante borgo", "cultural_info"),
    ("tempo sembra scorrere", "cultural_info"),
    ("tempo sembra essersi fermato", "cultural_info"),
    ("incantevole borgo", "cultural_info"),
    ("fascino intatto dei borghi", "cultural_info"),
    ("cuochi ed i volontari", "dish_info")
]

for pattern, col in canned_patterns:
    cur.execute(f"SELECT count(*) FROM festivals WHERE {col} ILIKE %s;", (f"%{pattern}%",))
    cnt = cur.fetchone()[0]
    print(f"Column '{col}' with '{pattern}': {cnt}")

print("\n--- Detailed Records with Canned Text ---")
cur.execute("""
    SELECT id, name, city, 
           coalesce(description, ''), 
           coalesce(cultural_info, ''), 
           coalesce(dish_info, '')
    FROM festivals
""")
rows = cur.fetchall()
canned_count = 0
for fid, name, city, desc, cult, dish in rows:
    found = []
    for pattern, col in canned_patterns:
        val = desc if col == "description" else cult if col == "cultural_info" else dish
        if pattern.lower() in val.lower():
            found.append(f"{col}:{pattern}")
    if found:
        canned_count += 1
        print(f"[{city}] {name}: {', '.join(found)}")

print(f"\nTotal festivals with canned text: {canned_count}/{total}")
conn.close()
