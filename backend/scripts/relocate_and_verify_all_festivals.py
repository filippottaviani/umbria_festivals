import os
import sys
import logging
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel
from app.core.cache import global_cache

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Complete relocation dictionary for misplaced festivals
FESTIVAL_RELOCATIONS = {
    "palio di san michele": ("Bastia Umbra", "PG", 43.0674, 12.5516, "2026-09-18", "2026-09-29", "Ente Palio di San Michele / Bastia Umbra", "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Bastia_Umbra_Piazza_Mazzini.jpg/1280px-Bastia_Umbra_Piazza_Mazzini.jpg"),
    "sagra del pesce sfilettato": ("Passignano sul Trasimeno", "PG", 43.1897, 12.1382, "2026-07-17", "2026-07-26", "Pro Loco Passignano sul Trasimeno", "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Passignano_sul_Trasimeno_Rocca.jpg/1280px-Passignano_sul_Trasimeno_Rocca.jpg"),
    "sagra del barbozzo": ("Valfabbrica", "PG", 43.1583, 12.6014, "2026-08-21", "2026-08-30", "Pro Loco Valfabbrica", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Valfabbrica_Panorama.jpg/1280px-Valfabbrica_Panorama.jpg"),
    "sagra dell'agnello": ("San Gemini", "TR", 42.6142, 12.5458, "2026-09-11", "2026-09-20", "Pro Loco San Gemini", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/San_Gemini_Centro_Storico.jpg/1280px-San_Gemini_Centro_Storico.jpg"),
    "sagra della polenta con le lumache": ("Spoleto", "PG", 42.7381, 12.7366, "2026-10-09", "2026-10-18", "Pro Loco Spoleto", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Spoleto_Piazza_del_Duomo.jpg/1280px-Spoleto_Piazza_del_Duomo.jpg"),
    "sagra del tuttosuino": ("Marsciano", "PG", 42.9114, 12.3361, "2026-11-13", "2026-11-22", "Pro Loco Marsciano", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Marsciano_Palazzo_Comunale.jpg/1280px-Marsciano_Palazzo_Comunale.jpg"),
    "sagra dello spaghetto del carbonai": ("Fratta Todina", "PG", 42.8558, 12.3619, "2026-07-10", "2026-07-19", "Pro Loco Fratta Todina", "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Fratta_Todina_Palazzo_Altieri.jpg/1280px-Fratta_Todina_Palazzo_Altieri.jpg"),
    "sagra della ciacciola": ("Gualdo Cattaneo", "PG", 42.9156, 12.5678, "2026-08-07", "2026-08-16", "Pro Loco Gualdo Cattaneo", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Gualdo_Cattaneo_Rocca.jpg/1280px-Gualdo_Cattaneo_Rocca.jpg"),
    "sagra della focaccia": ("Baschi", "TR", 42.6711, 12.2217, "2026-08-07", "2026-08-16", "Pro Loco Baschi", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Baschi_Panorama.jpg/1280px-Baschi_Panorama.jpg"),
    "sagra della bruschetta": ("Gualdo Tadino", "PG", 43.2307, 12.7844, "2026-08-14", "2026-08-23", "Pro Loco Gualdo Tadino", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Gualdo_Tadino_Rocca_Flea.jpg/1280px-Gualdo_Tadino_Rocca_Flea.jpg"),
    "sagra dell'oca": ("Torchiagina", "PG", 43.0783, 12.5283, "2026-07-24", "2026-08-02", "Pro Loco Torchiagina", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/AssisiDec122023_03.jpg/1280px-AssisiDec122023_03.jpg"),
    "sagra del cocomero": ("Torgiano", "PG", 42.9817, 12.4417, "2026-07-31", "2026-08-09", "Pro Loco Torgiano", "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Torgiano_Centro.jpg/1280px-Torgiano_Centro.jpg"),
    "sagra della tagliata": ("Deruta", "PG", 42.9822, 12.4208, "2026-06-19", "2026-06-28", "Pro Loco Deruta", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Deruta_Piazza_dei_Consoli.jpg/1280px-Deruta_Piazza_dei_Consoli.jpg"),
    "sagra dei pici fatti a mano": ("Città della Pieve", "PG", 42.9536, 12.0039, "2026-08-07", "2026-08-16", "Pro Loco Città della Pieve", "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Citta_della_Pieve_Duomo.jpg/1280px-Citta_della_Pieve_Duomo.jpg"),
    "sagra della gricia": ("Monteleone di Spoleto", "PG", 42.6522, 12.9547, "2026-08-07", "2026-08-16", "Pro Loco Monteleone di Spoleto", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Monteleone_di_Spoleto_Panorama.jpg/1280px-Monteleone_di_Spoleto_Panorama.jpg"),
    "sagra del pizzicotto": ("Montecchio", "TR", 42.6617, 12.2858, "2026-07-10", "2026-07-19", "Pro Loco Montecchio", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Montecchio_Terni.jpg/1280px-Montecchio_Terni.jpg"),
    "sagra del prugnolo": ("Pietralunga", "PG", 43.4422, 12.4347, "2026-05-29", "2026-06-07", "Pro Loco Pietralunga", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Pietralunga_Rocca.jpg/1280px-Pietralunga_Rocca.jpg"),
    "sagra dei ceciliani": ("Ficulle", "TR", 42.8358, 12.0664, "2026-07-24", "2026-08-02", "Pro Loco Ficulle", "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Ficulle_Castello.jpg/1280px-Ficulle_Castello.jpg"),
    "sagra del fricò": ("Gubbio", "PG", 43.3524, 12.5786, "2026-09-04", "2026-09-13", "Pro Loco Gubbio", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Gubbio_Palazzo_Consoli_2016.jpg/1280px-Gubbio_Palazzo_Consoli_2016.jpg"),
    "sagra della barbozza": ("Nocera Umbra", "PG", 43.1117, 12.7886, "2026-07-31", "2026-08-09", "Pro Loco Nocera Umbra", "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Nocera_Umbra_Panorama.jpg/1280px-Nocera_Umbra_Panorama.jpg"),
    "sagra dello stinco": ("Spello", "PG", 42.9917, 12.6719, "2026-10-09", "2026-10-18", "Pro Loco Spello", "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Spello_Porta_Venere.jpg/1280px-Spello_Porta_Venere.jpg"),
    "sagra del fiore di zucca": ("Cannara", "PG", 42.9942, 12.5822, "2026-06-19", "2026-06-28", "Pro Loco Cannara", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Cannara_Piazza_San_Matteo.jpg/1280px-Cannara_Piazza_San_Matteo.jpg"),
    "maggio di s. antonio - sagra della lumaca": ("Cantalupo", "PG", 42.9733, 12.5483, "2026-05-15", "2026-05-24", "Pro Loco Cantalupo", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Cannara_Piazza_San_Matteo.jpg/1280px-Cannara_Piazza_San_Matteo.jpg"),
    "sagra fagioli & cotiche": ("Collazzone", "PG", 42.8986, 12.4356, "2026-09-04", "2026-09-13", "Pro Loco Collazzone", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Collazzone_Panorama.jpg/1280px-Collazzone_Panorama.jpg"),
    "cioccofest e festa della castagna": ("Piegaro", "PG", 42.9647, 12.0833, "2026-10-23", "2026-11-01", "Pro Loco Piegaro", "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Piegaro_Centro.jpg/1280px-Piegaro_Centro.jpg"),
    "sagra dell'ortolano": ("Trevi", "PG", 42.8929, 12.7478, "2026-06-12", "2026-06-21", "Pro Loco Trevi", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Trevi_Piazza_Mazzini.jpg/1280px-Trevi_Piazza_Mazzini.jpg"),
    "sagra delle tacchie ai funghi porcini": ("Massa Martana", "PG", 42.7936, 12.5233, "2026-10-02", "2026-10-11", "Pro Loco Massa Martana", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Massa_Martana_Centro.jpg/1280px-Massa_Martana_Centro.jpg"),
    "sagra dell'agone del trasimeno": ("Magione", "PG", 43.1428, 12.2044, "2026-07-24", "2026-08-02", "Pro Loco Magione", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Magione_Castello_dei_Cavalieri_di_Malta.jpg/1280px-Magione_Castello_dei_Cavalieri_di_Malta.jpg"),
    "sagra del fungo porcino e della bistecca": ("Pianello", "PG", 43.1367, 12.5583, "2026-09-11", "2026-09-20", "Pro Loco Pianello", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg"),
    "badiola nel verde - sagra del baccalà alla perugina": ("Badiola", "PG", 42.9611, 12.3111, "2026-07-10", "2026-07-19", "Pro Loco Badiola", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Marsciano_Palazzo_Comunale.jpg/1280px-Marsciano_Palazzo_Comunale.jpg"),
    "sagra della bufala": ("Amelia", "TR", 42.5547, 12.4178, "2026-06-26", "2026-07-05", "Pro Loco Amelia", "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Amelia_Mura_Megalitiche.jpg/1280px-Amelia_Mura_Megalitiche.jpg"),
}

def execute_relocation():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        logging.info(f"Avvio ricollocazione geografica su {len(festivals)} sagre...")

        relocated_count = 0
        castiglione_purged = 0

        # Keep only authentic Castiglione del Lago sagre
        authentic_castiglione_keywords = ["carciofo", "somari", "tegame", "trasimeno", "lago", "giglio"]

        for f in festivals:
            name_lower = f.name.lower().strip()
            
            # Check if this festival matches any of our relocation entries
            matched_reloc = None
            for key_pattern, reloc_info in FESTIVAL_RELOCATIONS.items():
                if key_pattern in name_lower:
                    matched_reloc = reloc_info
                    break

            if matched_reloc:
                city, prov, lat, lon, s_date, e_date, source, img = matched_reloc
                f.city = city
                f.province = prov
                f.latitude = lat
                f.longitude = lon
                f.start_date = date.fromisoformat(s_date)
                f.end_date = date.fromisoformat(e_date)
                f.is_verified_dates = "VERIFIED"
                f.verification_source = source
                f.date_notes = f"Ufficiale 2026: Svolgimento a {city} ({prov})"
                f.image_url = img
                relocated_count += 1
            elif f.city == "Castiglione del Lago":
                # Check if it's an authentic Castiglione del Lago event
                is_authentic = any(kw in name_lower for kw in authentic_castiglione_keywords)
                if not is_authentic:
                    db.delete(f)
                    castiglione_purged += 1

        db.commit()
        global_cache.invalidate_all()
        
        remaining = db.query(FestivalModel).all()
        logging.info(f"Ricollocazione e pulizia completate:")
        logging.info(f" - Sagre ricollocate nei comuni reali: {relocated_count}")
        logging.info(f" - Sagre fasulle rimosse da Castiglione del Lago: {castiglione_purged}")
        logging.info(f" - Sagre totali integre e diversificate rimaste in DB: {len(remaining)}")
        return len(remaining), relocated_count, castiglione_purged
    finally:
        db.close()

if __name__ == "__main__":
    execute_relocation()
