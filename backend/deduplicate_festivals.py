import psycopg2
from psycopg2.extras import DictCursor
import os
from datetime import timedelta

def deduplicate():
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/umbriafestivals')
    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=DictCursor)

    # Find duplicate names
    cur.execute("SELECT name FROM festivals GROUP BY name HAVING COUNT(*) > 1;")
    duplicate_names = [row['name'] for row in cur.fetchall()]

    for name in duplicate_names:
        cur.execute("SELECT * FROM festivals WHERE name = %s;", (name,))
        records = cur.fetchall()

        # Group by overlap (if start dates are within 14 days)
        groups = []
        for record in records:
            added = False
            for group in groups:
                if abs((group[0]['start_date'] - record['start_date']).days) <= 14:
                    group.append(record)
                    added = True
                    break
            if not added:
                groups.append([record])

        for group in groups:
            if len(group) <= 1:
                continue

            # Sort group to find the "best" primary record
            # Best: city != 'Perugia' (unless all are), has coords, has most fields
            def score(r):
                s = 0
                if r['city'].lower() != 'perugia':
                    s += 100
                if r['latitude'] is not None:
                    s += 50
                # count non-null descriptive fields
                for f in ['cultural_info', 'dish_info', 'description', 'menu_info', 'image_url']:
                    if r[f] and len(str(r[f]).strip()) > 5:
                        s += 10
                return s

            group.sort(key=score, reverse=True)
            primary = group[0]
            secondaries = group[1:]

            print(f"Merging '{name}'")
            print(f"  Primary: {primary['id']} - {primary['city']} ({primary['start_date']})")

            merged_data = dict(primary)

            # Merge missing fields from secondaries
            for sec in secondaries:
                print(f"  Secondary to merge/delete: {sec['id']} - {sec['city']} ({sec['start_date']})")
                for field in ['cultural_info', 'dish_info', 'description', 'menu_info', 'image_url', 'source_url', 'latitude', 'longitude']:
                    if not merged_data[field] and sec[field]:
                        merged_data[field] = sec[field]

            # Update primary in DB
            cur.execute("""
                UPDATE festivals
                SET cultural_info = %s, dish_info = %s, description = %s, menu_info = %s, image_url = %s, latitude = %s, longitude = %s
                WHERE id = %s
            """, (
                merged_data['cultural_info'], merged_data['dish_info'], merged_data['description'],
                merged_data['menu_info'], merged_data['image_url'], merged_data['latitude'], merged_data['longitude'],
                primary['id']
            ))

            # Re-assign reviews and delete secondaries
            for sec in secondaries:
                cur.execute("UPDATE reviews SET festival_id = %s WHERE festival_id = %s", (primary['id'], sec['id']))
                cur.execute("DELETE FROM festivals WHERE id = %s", (sec['id'],))

    conn.commit()
    cur.close()
    conn.close()
    print("Deduplication finished.")

if __name__ == '__main__':
    deduplicate()
