import urllib.request
import urllib.parse
import json
import time
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

# Fallback dictionary from scraper
TOWN_COORDINATES = {
    "Perugia": (43.1107, 12.3908),
    "Terni": (42.5642, 12.6406),
    "Foligno": (42.9561, 12.7034),
    "Città di Castello": (43.4566, 12.2393),
    "Spoleto": (42.7352, 12.7368),
    "Orvieto": (42.7186, 12.1121),
    "Narni": (42.5181, 12.5153),
    "Todi": (42.7818, 12.4069),
    "Gubbio": (43.3516, 12.5786),
    "Bastia Umbra": (43.0678, 12.5511),
    "Marsciano": (42.9125, 12.3364),
    "Assisi": (43.0707, 12.6196),
    "Umbertide": (43.3061, 12.3314),
    "Castiglione del Lago": (43.1264, 12.0469),
    "Gualdo Tadino": (43.2307, 12.7844),
    "Amelia": (42.5544, 12.4178),
    "Bevagna": (42.9347, 12.6083),
    "Montefalco": (42.8933, 12.6517),
    "Norcia": (42.7925, 13.0931),
    "Cascia": (42.7189, 13.0131),
    "Colfiorito": (43.0167, 12.9167),
    "Balanzano": (43.0767, 12.4239),
    "Pietrafitta": (42.9903, 12.2131),
    "Pozzo": (42.8711, 12.5317),
    "Pila": (43.0681, 12.3344),
    "Cannaiola": (42.8681, 12.6289),
    "Gaglietole": (42.8647, 12.4639),
    "Guardea": (42.6231, 12.2961),
    "San Brizio": (42.7911, 12.6847),
    "Lugnano in Teverina": (42.5744, 12.3308),
    "Scheggino": (42.7125, 12.8317),
    "Baiano": (42.6989, 12.6981),
    "Trevi": (42.8931, 12.7461),
    "Spello": (42.9922, 12.6719),
    "Cannara": (42.9953, 12.5839),
    "Montecastrilli": (42.6498, 12.4878),
    
    # Hand-added for ones that Wikipedia might miss
    "Casa Del Diavolo": (43.1970, 12.4680),
    "Pierantonio": (43.2650, 12.3360),
    "Grutti": (42.8600, 12.4840),
    "Marcellano": (42.8560, 12.4850),
    "Fratticiola Selvatica": (43.2080, 12.5530),
    "Castelnuovo": (43.0450, 12.5550),
    "Castiglion Fosco": (42.9690, 12.1930),
    "Ammeto": (42.9180, 12.3350),
    "Annifo": (43.0200, 12.8460)
}

def get_coordinates(city):
    if city in TOWN_COORDINATES:
        return TOWN_COORDINATES[city]
        
    # Try Wikipedia API
    try:
        query = urllib.parse.quote(city)
        url = f'https://it.wikipedia.org/w/api.php?action=query&prop=coordinates&titles={query}&format=json'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=5)
        data = json.loads(resp.read().decode('utf-8'))
        
        pages = data.get('query', {}).get('pages', {})
        for pid, pdata in pages.items():
            coords = pdata.get('coordinates')
            if coords and len(coords) > 0:
                lat = float(coords[0]['lat'])
                lon = float(coords[0]['lon'])
                # Cache it
                TOWN_COORDINATES[city] = (lat, lon)
                return lat, lon
    except Exception as e:
        print(f"Error fetching Wikipedia coordinates for {city}: {e}")
            
    return None, None

def main():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        
        updated = 0
        for f in festivals:
            if not f.city or f.city.lower() == "umbria":
                continue
                
            lat, lon = get_coordinates(f.city)
            if lat and lon:
                # Update if different
                if f.latitude != lat or f.longitude != lon:
                    print(f"Updating {f.city}: {lat}, {lon}")
                    f.latitude = lat
                    f.longitude = lon
                    updated += 1
            else:
                print(f"Could not find coordinates for: {f.city}")
                
        db.commit()
        print(f"Successfully updated coordinates for {updated} festivals.")
        
    finally:
        db.close()

if __name__ == '__main__':
    main()
