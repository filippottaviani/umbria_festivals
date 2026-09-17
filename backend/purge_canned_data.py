"""
Script per bonificare completamente il database PostgreSQL da tutti i testi pomposi,
retorici, ripetitivi o derivanti da vecchi generatori a template pre-AI.
"""

import os
import psycopg2
from app.core.agent_writer import (
    generate_organic_festival_description,
    generate_borgo_cultural_info,
    TOWN_CULTURAL_KNOWLEDGE
)

CANNED_PATTERNS = [
    "appuntamento simbolo",
    "ricca di fascino",
    "ritrovo festoso",
    "generazioni di paesani",
    "autentica convivialit",
    "affascinante borgo dell'umbria immerso nelle colline",
    "tempo sembra scorrere a una velocit",
    "tempo sembra essersi fermato",
    "incantevole borgo dell'umbria, ricco di storia",
    "cuore più autentico dell'umbria",
    "cuochi ed i volontari di",
    "vuoi promuovere la tua sagra",
    "trova la tua sagra preferita"
]

def clean_database():
    db_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/umbriafestivals')
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("SELECT id, name, city, province, description, cultural_info, dish_info, menu_info, program_info FROM festivals;")
    festivals = cur.fetchall()
    print(f"Analisi di {len(festivals)} eventi nel database...")

    desc_cleaned = 0
    cult_cleaned = 0
    dish_cleaned = 0

    for fid, name, city, province, desc, cult, dish, menu, prog in festivals:
        city_clean = (city or "").strip()
        prov_clean = (province or "PG").strip()
        new_desc = desc
        new_cult = cult
        new_dish = dish

        # 1. Pulizia dish_info
        if dish and "cuochi ed i volontari" in dish.lower():
            new_dish = None
            dish_cleaned += 1
            print(f"[DISH] Rimosso testo fittizio per '{name}' ({city_clean})")

        # 2. Pulizia cultural_info
        needs_cult_clean = False
        if cult:
            c_low = cult.lower()
            if (
                "affascinante borgo dell'umbria immerso nelle colline" in c_low
                or "tempo sembra scorrere a una velocit" in c_low
                or "tempo sembra essersi fermato" in c_low
                or "cuore più autentico dell'umbria" in c_low
                or "incantevole borgo dell'umbria, ricco di storia" in c_low
            ):
                needs_cult_clean = True

        if needs_cult_clean:
            # Rigenera con il nuovo generatore pulito (senza frasi pompose)
            clean_cult = generate_borgo_cultural_info(city=city_clean, province=prov_clean, name=name)
            new_cult = clean_cult
            cult_cleaned += 1
            print(f"[CULTURE] Bonificata scheda borgo per '{city_clean}' ({name})")

        # 3. Pulizia description
        needs_desc_clean = False
        if desc:
            d_low = desc.lower()
            if (
                "appuntamento simbolo" in d_low
                or "ricca di fascino" in d_low
                or "ritrovo festoso" in d_low
                or "generazioni di paesani" in d_low
                or "autentica convivialit" in d_low
                or "vuoi promuovere la tua sagra" in d_low
                or ("trova la tua sagra" in d_low and "p.iva" in d_low)
                or ("gaglietole" in d_low and city_clean.lower() != "gaglietole")
            ):
                needs_desc_clean = True
        else:
            needs_desc_clean = True

        if needs_desc_clean:
            # Rigenera descrizione con il nuovo generatore AI / sintetico fattuale pulito
            clean_desc = generate_organic_festival_description(
                name=name,
                city=city_clean,
                province=prov_clean,
                dish_info=new_dish,
                cultural_info=new_cult,
                menu_info=menu,
                program_info=prog
            )
            new_desc = clean_desc
            desc_cleaned += 1
            print(f"[DESC] Bonificata descrizione per '{name}' ({city_clean})")

        # Aggiorna record nel DB se modificato
        if new_desc != desc or new_cult != cult or new_dish != dish:
            cur.execute("""
                UPDATE festivals 
                SET description = %s, cultural_info = %s, dish_info = %s
                WHERE id = %s;
            """, (new_desc, new_cult, new_dish, fid))

    conn.commit()
    print("\n--- RISULTATI BONIFICA ---")
    print(f"Descrizioni bonificate: {desc_cleaned}")
    print(f"Schede borgo bonificate: {cult_cleaned}")
    print(f"Schede piatti bonificate: {dish_cleaned}")

    # Verifica finale: controllo che NESSUN festival contenga formule pompose residue
    print("\n--- VERIFICA FINALE ---")
    cur.execute("SELECT id, name, city, coalesce(description,''), coalesce(cultural_info,''), coalesce(dish_info,'') FROM festivals;")
    all_rows = cur.fetchall()
    remaining = 0
    for fid, name, city, d, c, di in all_rows:
        found = []
        for pat in CANNED_PATTERNS:
            if pat.lower() in d.lower():
                found.append(f"desc:{pat}")
            if pat.lower() in c.lower():
                found.append(f"cult:{pat}")
            if pat.lower() in di.lower():
                found.append(f"dish:{pat}")
        if found:
            remaining += 1
            print(f"ATTENZIONE: residuo in [{city}] {name}: {', '.join(found)}")

    if remaining == 0:
        print("PERFETTO: 0 eventi contengono formule pompose o retoriche residue!")
    else:
        print(f"ATTENZIONE: {remaining} eventi contengono ancora residui!")

    conn.close()

if __name__ == "__main__":
    clean_database()
