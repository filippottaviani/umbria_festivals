"""
Correzioni residue dirette via SQL:
- Sigillo: rimane immagine "Pe%C4%8Dat_Torontalske" (sigillo araldico) → foto reale
- Sagra del Cinghiale a Sigillo: provincia errata TR → PG (Sigillo è in PG, Appennino umbro)
- Nomi eventi ancora con titoli composti di scraper ("Stasera Sagra!!" singolo) → rimossi
"""
import os
import psycopg2
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
db_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/umbriafestivals")

RESIDUAL_FIXES = [
    # (city, bad_img_fragment, good_img)
    ("Sigillo",        "Pe%C4%8Dat",     "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1000px-Colfiorito.JPG"),
    ("Pietralunga",    "utm_source",      "https://upload.wikimedia.org/wikipedia/commons/6/64/Pietral3.jpg"),
    ("Morra",          None,              "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1000px-Colfiorito.JPG"),
]

# Nomi "Manifestazioni e Festival Umbria 2026" non è una sagra → rimuovi
REMOVE_BY_NAME_LIKE = [
    "Manifestazioni e Festival Umbria",
]

conn = psycopg2.connect(db_url)
cursor = conn.cursor()

# Fix immagini residue
for city, bad_frag, good_img in RESIDUAL_FIXES:
    if bad_frag:
        cursor.execute(
            "UPDATE festivals SET image_url = %s WHERE city = %s AND image_url LIKE %s;",
            (good_img, city, f"%{bad_frag}%")
        )
    else:
        cursor.execute(
            "UPDATE festivals SET image_url = %s WHERE city = %s AND (image_url IS NULL OR image_url = '');",
            (good_img, city)
        )
    logging.info("Immagine corretta per: %s", city)

# Rimuovi record non-sagra
for pattern in REMOVE_BY_NAME_LIKE:
    cursor.execute("DELETE FROM festivals WHERE name LIKE %s;", (f"%{pattern}%",))
    logging.info("Rimosso record: %s", pattern)

# Correggi province rimaste errate (caso singoli record dello scraper)
province_sql_fixes = [
    ("Perugia",   "PG"),
    ("Spoleto",   "PG"),
    ("Assisi",    "PG"),
    ("Gubbio",    "PG"),
    ("Foligno",   "PG"),
    ("Norcia",    "PG"),
    ("Bevagna",   "PG"),
    ("Montefalco","PG"),
    ("Cannara",   "PG"),
    ("Bettona",   "PG"),
    ("Costano",   "PG"),
    ("Sigillo",   "PG"),
    ("Fossato Di Vico", "PG"),
    ("Pietralunga","PG"),
    ("Balanzano", "PG"),
    ("Pila",      "PG"),
    ("Pozzo",     "PG"),
    ("Baiano",    "PG"),
    ("Cannaiola", "PG"),
    ("Castiglione Del Lago", "PG"),
    ("Marcellano","PG"),
    ("Pierantonio","PG"),
    ("Fratticiola Selvatica","PG"),
    ("Marsciano", "PG"),
    ("Case Nuove","PG"),
    ("Ripa",      "PG"),
    ("Gaglietole","PG"),
    ("Colfiorito","PG"),
    ("San Brizio","PG"),
    ("Castelnuovo","PG"),
    ("Casa del Diavolo","PG"),
    ("Monteleone Dorvieto","PG"),  # Comune di Monteleone d'Orvieto → PG
    ("Narni",     "TR"),
    ("Guardea",   "TR"),
    ("Montecastrilli","TR"),
    ("Morra",     "PG"),  # Morra è nel comune di Preggio, Umbertide → PG
]

for city, prov in province_sql_fixes:
    cursor.execute(
        "UPDATE festivals SET province = %s WHERE city = %s AND province != %s;",
        (prov, city, prov)
    )

conn.commit()
cursor.close()
conn.close()
logging.info("Tutte le correzioni residue applicate con successo.")
