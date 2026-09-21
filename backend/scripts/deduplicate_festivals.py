import psycopg2
from psycopg2.extras import DictCursor
import os
from datetime import timedelta

def deduplicate():
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/umbriafestivals')
    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=DictCursor)

    # Find duplicate (name, city) pairs
    cur.execute("""
        SELECT LOWER(TRIM(city)) AS norm_city, LOWER(TRIM(name)) AS norm_name
        FROM festivals
        GROUP BY LOWER(TRIM(city)), LOWER(TRIM(name))
        HAVING COUNT(*) > 1;
    """)
    duplicates = cur.fetchall()

    for row in duplicates:
        norm_city = row['norm_city']
        norm_name = row['norm_name']

        cur.execute("""
            SELECT * FROM festivals
            WHERE LOWER(TRIM(city)) = %s AND LOWER(TRIM(name)) = %s;
        """, (norm_city, norm_name))
        records = cur.fetchall()

        # Group by seasonal overlap (same year AND start dates within 21 days)
        groups = []
        for record in records:
            added = False
            for group in groups:
                ref = group[0]
                if ref['start_date'] and record['start_date']:
                    same_year = ref['start_date'].year == record['start_date'].year
                    date_diff = abs((ref['start_date'] - record['start_date']).days)
                    if same_year and date_diff <= 21:
                        group.append(record)
                        added = True
                        break
            if not added:
                groups.append([record])

        for group in groups:
            if len(group) <= 1:
                # Distinct editions across different years/seasons are kept in the archive!
                continue

            # Sort group to find the "best" primary record
            def score(r):
                s = 0
                if r['city'].lower() != 'perugia':
                    s += 100
                if r['latitude'] is not None and not (r['latitude'] == 43.1107 and r['longitude'] == 12.3908 and r['city'].lower() != 'perugia'):
                    s += 50
                # count non-null descriptive fields
                for f in ['cultural_info', 'dish_info', 'description', 'menu_info', 'image_url', 'program_info']:
                    if r[f] and len(str(r[f]).strip()) > 10:
                        s += 15
                return s

            group.sort(key=score, reverse=True)
            primary = group[0]
            secondaries = group[1:]

            print(f"Integrating duplicates for '{primary['name']}' in {primary['city']} ({primary['start_date'].year})")
            print(f"  Primary: {primary['id']} - {primary['city']} ({primary['start_date']} to {primary['end_date']})")

            merged_data = dict(primary)

            # Widen dates and merge missing/richer fields from secondaries
            for sec in secondaries:
                print(f"  Secondary to integrate: {sec['id']} - {sec['city']} ({sec['start_date']} to {sec['end_date']})")
                if merged_data.get('start_date') == merged_data.get('end_date') and sec['start_date'] != sec['end_date']:
                    merged_data['start_date'] = sec['start_date']
                    merged_data['end_date'] = sec['end_date']
                else:
                    if sec['start_date'] and (not merged_data['start_date'] or sec['start_date'] < merged_data['start_date']):
                        merged_data['start_date'] = sec['start_date']
                    if sec['end_date'] and (not merged_data['end_date'] or sec['end_date'] > merged_data['end_date']):
                        merged_data['end_date'] = sec['end_date']

                for field in ['province', 'cultural_info', 'dish_info', 'description', 'menu_info', 'image_url', 'program_info', 'source_url', 'latitude', 'longitude']:
                    if not merged_data.get(field) and sec[field]:
                        merged_data[field] = sec[field]
                    elif field == 'description' and sec['description'] and len(str(sec['description']).strip()) > len(str(merged_data.get('description') or '').strip()) + 40:
                        merged_data[field] = sec[field]

            # Update primary in DB
            cur.execute("""
                UPDATE festivals
                SET start_date = %s, end_date = %s, province = %s, cultural_info = %s, dish_info = %s,
                    description = %s, menu_info = %s, image_url = %s, program_info = %s,
                    latitude = %s, longitude = %s
                WHERE id = %s
            """, (
                merged_data['start_date'], merged_data['end_date'],
                merged_data.get('province'),
                merged_data['cultural_info'], merged_data['dish_info'],
                merged_data['description'], merged_data['menu_info'],
                merged_data['image_url'], merged_data['program_info'],
                merged_data['latitude'], merged_data['longitude'],
                primary['id']
            ))

            # Re-assign reviews and delete secondaries
            for sec in secondaries:
                cur.execute("UPDATE reviews SET festival_id = %s WHERE festival_id = %s", (primary['id'], sec['id']))
                cur.execute("DELETE FROM festivals WHERE id = %s", (sec['id'],))

    conn.commit()
    cur.close()
    conn.close()
    print("Archive-safe deduplication finished.")

if __name__ == '__main__':
    deduplicate()
