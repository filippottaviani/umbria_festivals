import os
import sys
import re
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel
from app.core.agent_writer import generate_borgo_cultural_info, generate_organic_festival_description
from app.core.cache import global_cache

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def fix_all_cultural_texts():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        logging.info(f"Avvio verifica e riparazione testi culturali per {len(festivals)} sagre...")

        bastia_fixed = 0
        cleaned_text_count = 0

        for f in festivals:
            # 1. Strip leading commas, spaces, or stray symbols from description & cultural_info
            if f.description:
                f.description = re.sub(r"^[\s,–—]+", "", f.description).strip()
            if f.cultural_info:
                f.cultural_info = re.sub(r"^[\s,–—]+", "", f.cultural_info).strip()

            # 2. Check for mismatched cultural_info (e.g. Castiglione del Lago text inside Bastia Umbra or other towns)
            if f.city == "Bastia Umbra" or "bastia" in f.city.lower():
                f.cultural_info = "Bastia Umbra è un importante centro della Valle Umbra situato lungo il corso del fiume Chiascio, tra Perugia ed Assisi. Ha una ricca storia industriale ed agricola, nota per il centro fieristico Umbriafiere e per il centro storico sviluppatosi attorno alla Chiesa di Santa Croce e a Piazza Mazzini."
                if "palio" in f.name.lower():
                    f.description = "Il Palio di San Michele a Bastia Umbra nasce nel 1962 in occasione della consacrazione della nuova Chiesa Parrocchiale. Organizzato dall'Ente Palio e dai quattro Rioni (Moncioveta, Portella, Sant'Angelo, San Rocco), trasforma la città in un palcoscenico a cielo aperto con sfilate teatrali, giochi in piazza e la tradizionale corsa dei carretti."
                bastia_fixed += 1
            else:
                # If cultural_info mentions wrong landmarks (e.g. Lago Trasimeno in a non-lake town)
                c_lower = (f.cultural_info or "").lower()
                if "trasimeno" in c_lower and f.city not in ["Castiglione del Lago", "Passignano sul Trasimeno", "Tuoro sul Trasimeno", "Magione", "Panicale", "Piegaro", "Castel Rigone", "Paciano"]:
                    f.cultural_info = generate_borgo_cultural_info(f.city, f.province, f.name)
                    cleaned_text_count += 1

        db.commit()
        global_cache.invalidate_all()
        logging.info(f"Riparazione testi completata con successo:")
        logging.info(f" - Scheda Bastia Umbra riscritta correttamente: {bastia_fixed}")
        logging.info(f" - Testi culturali incongruenti rigenerati: {cleaned_text_count}")
        return len(festivals), bastia_fixed, cleaned_text_count
    finally:
        db.close()

if __name__ == "__main__":
    fix_all_cultural_texts()
