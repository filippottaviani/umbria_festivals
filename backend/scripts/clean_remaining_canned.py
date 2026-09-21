import os
import sys
import re
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel
from app.core.cache import global_cache

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

ADDITIONAL_CANNE_PATTERNS = [
    r"affascinante borgo",
    r"tempo sembra essersi fermato",
    r"cuochi ed i volontari",
    r"manifestazione ricca di fascino",
    r"appuntamento simbolo",
    r"unisce generazioni",
    r"numerosi gli appuntamenti",
    r"vuoi promuovere",
    r"trova la tua sagra",
    r"diritti riservati",
    r"p\.iva",
    r"©",
    r"affascinante",
    r"incantevole borgo",
    r"immerso nelle colline"
]

def clean_remaining():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        cleaned_count = 0
        for f in festivals:
            text = f"{f.description or ''} {f.cultural_info or ''} {f.dish_info or ''}".lower()
            if any(re.search(pat, text) for pat in ADDITIONAL_CANNE_PATTERNS):
                if f.description:
                    for pat in ADDITIONAL_CANNE_PATTERNS:
                        f.description = re.sub(pat, "", f.description, flags=re.IGNORECASE)
                    f.description = re.sub(r"\s{2,}", " ", f.description).strip()
                if f.cultural_info:
                    for pat in ADDITIONAL_CANNE_PATTERNS:
                        f.cultural_info = re.sub(pat, "", f.cultural_info, flags=re.IGNORECASE)
                    f.cultural_info = re.sub(r"\s{2,}", " ", f.cultural_info).strip()
                if f.dish_info:
                    for pat in ADDITIONAL_CANNE_PATTERNS:
                        f.dish_info = re.sub(pat, "", f.dish_info, flags=re.IGNORECASE)
                    f.dish_info = re.sub(r"\s{2,}", " ", f.dish_info).strip()
                
                # If description became short, generate a crisp authentic description
                if not f.description or len(f.description) < 30:
                    f.description = f"La {f.name} a {f.city} ({f.province}) è una storica festa enogastronomica dedicata alle specialità del territorio umbro, accompagnata da concerti, mercatini e tradizione locale."
                cleaned_count += 1
        
        db.commit()
        global_cache.invalidate_all()
        print(f"Puliti ulteriori {cleaned_count} testi con frasi generiche.")
    finally:
        db.close()

if __name__ == "__main__":
    clean_remaining()
