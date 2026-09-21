import re
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

EXACT_COORDINATES = {
    "stroncone": (42.4994, 12.6631),
    "montefranco": (42.5975, 12.7642),
    "baschi": (42.6739, 12.2217),
    "monteleone dorvieto": (42.8406, 12.0514),
    "monteleone d'orvieto": (42.8406, 12.0514),
    "assisi": (43.0707, 12.6196),
    "magione": (43.1428, 12.2042),
    "castiglione del lago": (43.1264, 12.0469),
    "pianello": (43.1361, 12.5489),
    "tavernelle": (42.9892, 12.1706),
    "colfiorito": (43.0167, 12.9167),
    "fossato di vico": (43.2962, 12.7601),
    "villanova": (42.9417, 12.3278),
    "montecastrilli": (42.6498, 12.4878),
    "aguzzo": (42.4864, 12.6375),
    "ammeto": (42.9180, 12.3350),
    "pieve di compresseto": (43.2167, 12.7167),
    "castel rigone": (43.2139, 12.2389),
    "monte santa maria tiberina": (43.4372, 12.1611),
    "case nuove": (42.9250, 12.8330),
    "gualdo cattaneo": (42.9114, 12.5544),
    "baiano": (42.6989, 12.6981),
    "perugia": (43.1107, 12.3908),
    "bettona": (43.0139, 12.4842),
    "pierantonio": (43.2650, 12.3360),
    "paciano": (43.0223, 12.0708),
    "panicale": (43.0294, 12.0989),
    "piegaro": (42.9667, 12.0833),
    "deruta": (42.9833, 12.4167),
    "todi": (42.7818, 12.4069),
    "orvieto": (42.7186, 12.1121),
    "narni": (42.5181, 12.5153),
    "spoleto": (42.7352, 12.7368),
    "foligno": (42.9561, 12.7034),
    "gubbio": (43.3516, 12.5786),
    "norcia": (42.7925, 13.0931),
    "cascia": (42.7189, 13.0131),
    "cannara": (42.9953, 12.5839),
    "bevagna": (42.9347, 12.6083),
    "montefalco": (42.8933, 12.6517),
    "trevi": (42.8931, 12.7461),
    "spello": (42.9922, 12.6719),
    "guardea": (42.6231, 12.2961),
    "casa del diavolo": (43.1970, 12.4680),
    "pozzo": (42.8711, 12.5317),
    "pila": (43.0681, 12.3344),
    "cannaiola": (42.8681, 12.6289),
    "gaglietole": (42.8647, 12.4639),
    "san brizio": (42.7911, 12.6847),
    "castelnuovo": (43.0450, 12.5550),
    "castiglion fosco": (42.9690, 12.1930),
    "annifo": (43.0200, 12.8460),
    "grutti": (42.8600, 12.4840),
    "marcellano": (42.8560, 12.4850),
    "fratticiola selvatica": (43.2080, 12.5530),
    "papiano": (42.9329, 12.3551),
    "marsciano": (42.9125, 12.3364)
}

def find_coords(city, name):
    text = f"{city} {name}".lower()
    
    for key, (lat, lon) in EXACT_COORDINATES.items():
        if key in text:
            return lat, lon
            
    return 43.1107, 12.3908

def main():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        updated = 0
        
        for f in festivals:
            lat, lon = find_coords(f.city, f.name)
            if f.latitude != lat or f.longitude != lon:
                print(f"Fixing coords for {f.name} ({f.city}): {f.latitude},{f.longitude} -> {lat},{lon}")
                f.latitude = lat
                f.longitude = lon
                updated += 1
                
        db.commit()
        print(f"Successfully fixed coordinates for {updated} festivals.")
    finally:
        db.close()

if __name__ == '__main__':
    main()
