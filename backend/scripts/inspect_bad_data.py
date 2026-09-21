import psycopg2
import os

db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/umbriafestivals')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM festivals WHERE menu_info ILIKE '%diritti riservati%' OR menu_info ILIKE '%Part. IVA%';")
print('Bad menu count:', cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM festivals WHERE cultural_info ILIKE '%affascinante borgo dell%Umbria immerso nelle colline%';")
print('Generic cultural count:', cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM festivals WHERE description ILIKE 'Numerosi gli appuntamenti in programma%';")
print('Generic description count:', cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM festivals WHERE dish_info ILIKE 'I cuochi ed i volontari di % preparano per l%occasione%';")
print('Generic dish count:', cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM festivals WHERE latitude = 43.1107 AND longitude = 12.3908 AND city != 'Perugia';")
print('Bad coordinates count:', cur.fetchone()[0])

# check cities that seem wrong
cur.execute("SELECT city FROM festivals WHERE city ILIKE 'S % %';")
cities = [r[0] for r in cur.fetchall()]
print('Suspicious cities:', cities)

cur.close()
conn.close()
