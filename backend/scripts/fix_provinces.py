import re
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

# Map of cities to real province codes
TR_CITIES = {
    "terni", "orvieto", "narni", "amelia", "guardea", "stroncone", "montefranco",
    "monteleone dorvieto", "monteleone d'orvieto", "lugnano in teverina", "otricoli",
    "san gemini", "ferentillo", "arrone", "acquasparta", "montecastrilli", "alviano",
    "attigliano", "avigliano umbro", "baschi", "calvi dell'umbria", "castel viscardo",
    "fabro", "ficulle", "giove", "penna in teverina", "polino", "porano", "san venanzo",
    "montecchio"
}

OTHER_PROVINCES = {
    "marciano della chiana": "AR",
    "brolio": "AR",
    "cortona": "AR",
    "castiglione d'orcia": "SI",
    "altidona": "FM",
    "urbino": "PU",
    "serravalle di chienti": "MC"
}

def get_real_province(city_name):
    if not city_name:
        return "PG"
        
    c_lower = city_name.strip().lower()
    
    # Check exact/partial match for TR
    for tr_city in TR_CITIES:
        if tr_city in c_lower:
            return "TR"
            
    # Check other provinces
    for other_city, prov in OTHER_PROVINCES.items():
        if other_city in c_lower:
            return prov
            
    # Default all other Umbrian towns to PG (Perugia)
    return "PG"

def main():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        updated = 0
        
        for f in festivals:
            real_prov = get_real_province(f.city)
            if f.province != real_prov:
                print(f"Correcting province for {f.city}: {f.province} -> {real_prov}")
                f.province = real_prov
                updated += 1
                
        db.commit()
        print(f"Successfully corrected province for {updated} festivals.")
    finally:
        db.close()

if __name__ == '__main__':
    main()
