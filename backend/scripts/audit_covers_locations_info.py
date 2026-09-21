import os
import sys
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Known Umbrian Municipalities and correct province
UMBRIA_TOWNS_PROVINCE = {
    "Perugia": "PG", "Assisi": "PG", "Gubbio": "PG", "Foligno": "PG", "Spoleto": "PG",
    "Norcia": "PG", "Orvieto": "TR", "Narni": "TR", "Terni": "TR", "Cannara": "PG",
    "Bastia Umbra": "PG", "Bevagna": "PG", "Castiglione del Lago": "PG", "Città di Castello": "PG",
    "Umbertide": "PG", "Gualdo Tadino": "PG", "Marsciano": "PG", "Todi": "PG", "Deruta": "PG",
    "Corciano": "PG", "Magione": "PG", "Passignano sul Trasimeno": "PG", "Tuoro sul Trasimeno": "PG",
    "Panicale": "PG", "Piegaro": "PG", "Città della Pieve": "PG", "Trevi": "PG", "Montefalco": "PG",
    "Spello": "PG", "Valfabbrica": "PG", "Nocera Umbra": "PG", "Cascia": "PG", "Monteleone di Spoleto": "PG",
    "Preci": "PG", "Sellano": "PG", "Cerreto di Spoleto": "PG", "Vallo di Nera": "PG", "Sant'Anatolia di Narco": "PG",
    "Scheggino": "PG", "Ferentillo": "TR", "Arrone": "TR", "Montefranco": "TR", "Stroncone": "TR",
    "San Gemini": "TR", "Amelia": "TR", "Lugnano in Teverina": "TR", "Attigliano": "TR", "Giove": "TR",
    "Penna in Teverina": "TR", "Guardea": "TR", "Alviano": "TR", "Montecchio": "TR", "Baschi": "TR",
    "Acquasparta": "TR", "Avigliano Umbro": "TR", "Fabro": "TR", "Ficulle": "TR", "Allerona": "TR",
    "Castel Viscardo": "TR", "Montegabbione": "TR", "Monteleone d'Orvieto": "TR", "Parrano": "TR",
    "Porano": "TR", "Castel Giorgio": "TR", "Polino": "TR", "Otricoli": "TR", "Calvi dell'Umbria": "TR"
}

def audit():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        print(f"=== AUDIT COMPLESSIVO SU {len(festivals)} SAGRE IN DATABASE ===")
        
        # 1. Location Audit
        bad_coords = []
        none_coords = []
        bad_province = []
        for f in festivals:
            if f.latitude is None or f.longitude is None:
                none_coords.append((f.id, f.name, f.city))
            elif not (42.0 <= f.latitude <= 43.8) or not (11.8 <= f.longitude <= 13.2):
                bad_coords.append((f.id, f.name, f.city, f.latitude, f.longitude))
            
            expected_prov = UMBRIA_TOWNS_PROVINCE.get(f.city)
            if expected_prov and f.province != expected_prov:
                bad_province.append((f.id, f.name, f.city, f.province, expected_prov))

        print(f"\n1. LOCALITÀ & COORDINATE:")
        print(f"   - Sagre con coordinate NULLE (None): {len(none_coords)}")
        for item in none_coords[:5]:
            print(f"     * {item[1]} ({item[2]})")
        print(f"   - Coordinate fuori confini Umbria: {len(bad_coords)}")
        for item in bad_coords[:5]:
            print(f"     * {item[1]} ({item[2]}): lat={item[3]}, lon={item[4]}")
        print(f"   - Province errate: {len(bad_province)}")
        for item in bad_province[:5]:
            print(f"     * {item[1]} in {item[2]}: attuale={item[3]}, attesa={item[4]}")

        # 2. Cover / Images Audit
        missing_images = []
        image_counts = {}
        for f in festivals:
            img = f.image_url
            if not img or img.strip() == "":
                missing_images.append((f.id, f.name, f.city))
            else:
                image_counts[img] = image_counts.get(img, 0) + 1

        duplicates = {img: cnt for img, cnt in image_counts.items() if cnt > 1}
        print(f"\n2. COPERTINE & IMMAGINI:")
        print(f"   - Sagre senza image_url: {len(missing_images)}")
        print(f"   - Immagini duplicate usate su più sagre: {len(duplicates)}")
        for img, cnt in list(duplicates.items())[:5]:
            print(f"     * URL usata {cnt} volte: {img[:60]}...")

        # 3. Information Audit (Text, Menu, Dish, Cultural)
        canned_phrases = [
            "affascinante borgo", "tempo sembra essersi fermato", "cuochi ed i volontari",
            "manifestazione ricca di fascino", "appuntamento simbolo", "immerso nelle colline",
            "diritti riservati", "p.iva"
        ]
        
        canned_text_count = 0
        empty_info_count = 0
        for f in festivals:
            full_text = f"{f.description or ''} {f.cultural_info or ''} {f.dish_info or ''} {f.menu_info or ''}".lower()
            if any(p in full_text for p in canned_phrases):
                canned_text_count += 1
            if not f.description and not f.cultural_info and not f.dish_info and not f.menu_info:
                empty_info_count += 1

        print(f"\n3. QUALITÀ DELLE INFORMAZIONI:")
        print(f"   - Sagre con frasi generiche o canned: {canned_text_count}")
        print(f"   - Sagre completamente prive di informazioni descrittive: {empty_info_count}")

    finally:
        db.close()

if __name__ == "__main__":
    audit()
