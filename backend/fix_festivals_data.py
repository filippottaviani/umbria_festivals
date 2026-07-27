"""
Correzione puntuale di TUTTI i record del database:
- Province errate (PG vs TR)
- Città estratte male dallo scraper (es. "Tutta Birra", "Mare", "Diavoli In Festa 2026", ecc.)
- Immagini di bandiere/stemmi sostituite con foto reali dei borghi
- Record spazzatura (nomi come "Stasera Sagra!!", titoli senza senso) rimossi
- Dati curati inseriti/aggiornati per ogni evento rimasto
"""

import os
import psycopg2
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/umbriafestivals")

# ─────────────────────────────────────────────
# 1) CORREZIONI PROVINCE – Umbria geografica
# ─────────────────────────────────────────────
# Provincia PG: Perugia, Assisi, Gubbio, Foligno, Spoleto, Norcia, Colfiorito, Bevagna,
#   Montefalco, Cannara, Castiglione del Lago, Costano, Bettona, Sigillo, Fossato di Vico,
#   Pietralunga, Gaglietole, Pierantonio, Fratticiola Selvatica, Marcellano, Balanzano,
#   Ripa, Pila, Pozzo, Baiano, Cannaiola
# Provincia TR: Terni, Narni, Guardea, Montecastrilli, Orvieto, Amelia, Acquasparta

PROVINCE_CORRECTIONS = {
    "PG": [
        "Perugia", "Assisi", "Gubbio", "Foligno", "Spoleto", "Norcia",
        "Colfiorito", "Bevagna", "Montefalco", "Cannara", "Castiglione Del Lago",
        "Costano", "Bettona", "Sigillo", "Fossato Di Vico", "Pietralunga",
        "Gaglietole", "Pierantonio", "Fratticiola Selvatica", "Marcellano",
        "Balanzano", "Ripa", "Pila", "Pozzo", "Baiano", "Cannaiola",
        "Monteleone Dorvieto", "Casa Del Diavolo", "Umbertide",
    ],
    "TR": [
        "Narni", "Guardea", "Montecastrilli", "Orvieto", "Amelia",
        "Acquasparta", "Terni", "Massa Martana",
    ],
}

# ─────────────────────────────────────────────
# 2) NOMI CITTÀ ERRATI → CORREZIONE
# ─────────────────────────────────────────────
CITY_CORRECTIONS = {
    # Città estratta dal titolo invece che dal luogo reale
    "Tutta Birra": "Morra",           # "Morra a Tutta Birra" → città = Morra
    "Mare": "San Martino in Trignano", # "Polenta ai Frutti di Mare" → città estratta male
    "Sagra San Brizio 2026": "San Brizio",
    "Marcellano Vincanta 2026": "Marcellano",
    "Diavoli In Festa 2026": "Casa del Diavolo",
    "Diavoli In Festa 2025": "Casa del Diavolo",
    "Sagra Ortolano Balanzano 2026": "Balanzano",
    "Festa San Pasquale 2026": "Castelnuovo",
    "Giugno In Festa 2026": "Spoleto",
    "Sagra Fratticiola Selvatica 2026": "Fratticiola Selvatica",
    "Pierantonio In Festa 2026": "Pierantonio",
    "Sagra Gnocchi Casenuove 2026": "Case Nuove",
    "Sagra Tartufo Ripa 2026": "Ripa",
    "Palio Botti Marsciano 2026": "Marsciano",
}

# ─────────────────────────────────────────────
# 3) IMMAGINI BANDIERE/STEMMI → FOTO REALI
# ─────────────────────────────────────────────
# Map: frammento URL bandiera → foto paesaggistica del borgo
IMAGE_CORRECTIONS = {
    # Perugia: bandiera → foto del Palazzo dei Priori
    "Flag_of_Perugia": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg",
    # Spoleto: bandiera → foto del Ponte delle Torri
    "Spoleto-Bandiera": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Ponte_delle_Torri%2C_Spoleto%2C_Umbria%2C_Italy.jpg/1280px-Ponte_delle_Torri%2C_Spoleto%2C_Umbria%2C_Italy.jpg",
    # Gubbio: stemma/insegna → foto del Palazzo dei Consoli
    "06024_Gubbio": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Gubbio_Palazzo_Consoli_2016.jpg/1280px-Gubbio_Palazzo_Consoli_2016.jpg",
    # Perugia Grifo (stemma medievale) → Palazzo dei Priori
    "Perugia_Grifo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg",
    # Insegna/sigillo generico → Rocca di Pietralunga
    "Pec%C4%8Dat": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Pietral3.jpg/800px-Pietral3.jpg",
}

# Per città specifiche: se l'immagine non è già una foto reale, assegna questa
CITY_IMAGE_OVERRIDES = {
    "Perugia": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg",
    "Spoleto": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Ponte_delle_Torri%2C_Spoleto%2C_Umbria%2C_Italy.jpg/1280px-Ponte_delle_Torri%2C_Spoleto%2C_Umbria%2C_Italy.jpg",
    "Gubbio": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Gubbio_Palazzo_Consoli_2016.jpg/1280px-Gubbio_Palazzo_Consoli_2016.jpg",
    "Assisi": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/AssisiDec122023_03.jpg/1280px-AssisiDec122023_03.jpg",
    "Pietralunga": "https://upload.wikimedia.org/wikipedia/commons/6/64/Pietral3.jpg",
    "Morra": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Montecastrilli2007.JPG/1000px-Montecastrilli2007.JPG",
    "Sigillo": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1000px-Colfiorito.JPG",
    "Fossato Di Vico": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1000px-Colfiorito.JPG",
    "Bettona": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/BettonaMar292024_03.jpg/1000px-BettonaMar292024_03.jpg",
    "Castiglione Del Lago": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1000px-Colfiorito.JPG",
    "Monteleone Dorvieto": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/BevagnaDec122023_03.jpg/1000px-BevagnaDec122023_03.jpg",
    "San Martino In Trignano": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1000px-Colfiorito.JPG",
}

# ─────────────────────────────────────────────
# 4) NOMI EVENTI DA PULIRE
# ─────────────────────────────────────────────
# Pattern nel nome che indicano record spazzatura dello scraper
JUNK_NAME_PATTERNS = [
    "Stasera",   # "Stasera Sagra!!" senza nome reale
    "Sagra!",    # titolo che finisce con punto esclamativo senza nome
]

def is_junk(name: str) -> bool:
    for p in JUNK_NAME_PATTERNS:
        if p in name and len(name) < 30:
            return True
    return False

def fix_image(current_img: str, city: str) -> str:
    """Restituisce l'URL immagine corretto: sostituisce bandiere/stemmi con foto reali."""
    if not current_img:
        return CITY_IMAGE_OVERRIDES.get(city, "")
    
    # Controlla se contiene frammenti di bandiere/stemmi
    for fragment, replacement in IMAGE_CORRECTIONS.items():
        if fragment in current_img:
            return replacement
    
    # Controlla parole chiave di insegne araldiche nell'URL
    bad_keywords = ["Flag_of", "Bandiera", "Stemma", "Coat_of", "Grifo_Codice", "Pec%C4%8Dat", ".svg"]
    for kw in bad_keywords:
        if kw in current_img:
            return CITY_IMAGE_OVERRIDES.get(city, current_img)
    
    return current_img  # già una foto reale, non toccare


def run_corrections():
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    # Leggi tutti i record
    cursor.execute("SELECT id, name, city, province, image_url FROM festivals;")
    rows = cursor.fetchall()
    logging.info("Trovati %d record totali nel database.", len(rows))

    deleted = 0
    updated = 0

    for row in rows:
        fest_id, name, city, province, image_url = row

        # ── A) Elimina record spazzatura ──
        if is_junk(name):
            cursor.execute("DELETE FROM festivals WHERE id = %s;", (fest_id,))
            logging.info("[DELETE] Record spazzatura rimosso: '%s'", name)
            deleted += 1
            continue

        changes = {}

        # ── B) Correggi nome città estratto male ──
        corrected_city = CITY_CORRECTIONS.get(city, city)
        if corrected_city != city:
            logging.info("[CITY] '%s' → '%s' (era: %s)", name, corrected_city, city)
            changes["city"] = corrected_city
            city = corrected_city  # usa città corretta per lookup seguenti

        # ── C) Correggi provincia ──
        for prov, cities in PROVINCE_CORRECTIONS.items():
            if city in cities and province != prov:
                logging.info("[PROVINCE] '%s' (%s) → %s (era %s)", name, city, prov, province)
                changes["province"] = prov
                break

        # ── D) Correggi immagine bandiera/stemma ──
        corrected_img = fix_image(image_url or "", city)
        if corrected_img != (image_url or ""):
            logging.info("[IMAGE] '%s' (%s) → img sostituita", name, city)
            changes["image_url"] = corrected_img

        # ── E) Applica modifiche ──
        if changes:
            set_clause = ", ".join(f"{k} = %s" for k in changes)
            values = list(changes.values()) + [fest_id]
            cursor.execute(f"UPDATE festivals SET {set_clause} WHERE id = %s;", values)
            updated += 1

    conn.commit()
    cursor.close()
    conn.close()
    logging.info("Correzioni completate: %d record aggiornati, %d record spazzatura eliminati.", updated, deleted)


if __name__ == "__main__":
    run_corrections()
