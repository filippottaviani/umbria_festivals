import psycopg2
import os

def sanitize_db():
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/umbriafestivals')
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # 1. Nullify garbage menu info
    cur.execute("""
        UPDATE festivals 
        SET menu_info = NULL 
        WHERE menu_info ILIKE '%diritti riservati%' 
           OR menu_info ILIKE '%Part. IVA%'
           OR menu_info ILIKE '%©%';
    """)
    print(f"Cleaned menu_info: {cur.rowcount} rows updated.")

    # 2. Nullify generic cultural info
    cur.execute("""
        UPDATE festivals 
        SET cultural_info = NULL 
        WHERE cultural_info ILIKE '%affascinante borgo dell%Umbria immerso nelle colline%';
    """)
    print(f"Cleaned cultural_info: {cur.rowcount} rows updated.")

    # 3. Nullify generic dish info
    cur.execute("""
        UPDATE festivals 
        SET dish_info = NULL 
        WHERE dish_info ILIKE 'I cuochi ed i volontari di % preparano per l%occasione%';
    """)
    print(f"Cleaned dish_info: {cur.rowcount} rows updated.")

    # 4. Nullify generic description
    cur.execute("""
        UPDATE festivals 
        SET description = NULL 
        WHERE description ILIKE 'Numerosi gli appuntamenti in programma%';
    """)
    print(f"Cleaned description: {cur.rowcount} rows updated.")

    # 5. Fix invalid default coordinates (Perugia) for non-Perugia cities
    # Pydantic schema will need to allow None or we alter table if not already nullable
    cur.execute("""
        ALTER TABLE festivals ALTER COLUMN latitude DROP NOT NULL;
        ALTER TABLE festivals ALTER COLUMN longitude DROP NOT NULL;
    """)
    cur.execute("""
        UPDATE festivals 
        SET latitude = NULL, longitude = NULL 
        WHERE latitude = 43.1107 
          AND longitude = 12.3908 
          AND city != 'Perugia';
    """)
    print(f"Cleaned coordinates: {cur.rowcount} rows updated.")

    # 6. Fix specific city names that got mixed with Saints or locations
    city_fixes = {
        'S Eumenio Ficulle': 'Ficulle',
        'S Anna Paradiso Assisi': 'Assisi'
    }
    for bad_name, good_name in city_fixes.items():
        cur.execute("UPDATE festivals SET city = %s WHERE city = %s;", (good_name, bad_name))
        if cur.rowcount > 0:
            print(f"Fixed city name: {bad_name} -> {good_name}")

    conn.commit()
    cur.close()
    conn.close()
    print("Database sanitization complete!")

if __name__ == '__main__':
    sanitize_db()
