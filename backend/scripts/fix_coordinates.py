import urllib.request
import urllib.parse
import json
import time
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

def get_coordinates(city):
    queries = [
        f"{city}, Umbria, Italy",
        f"{city}, Italy"
    ]
    
    headers = {'User-Agent': 'UmbriaFestivals/1.0 (contact@example.com)'}
    
    for q in queries:
        try:
            query = urllib.parse.quote(q)
            url = f'https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1'
            req = urllib.request.Request(url, headers=headers)
            resp = urllib.request.urlopen(req, timeout=5)
            data = json.loads(resp.read().decode('utf-8'))
            
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return lat, lon
                
        except Exception as e:
            print(f"Error fetching coordinates for {city}: {e}")
            
        time.sleep(1) # Respect Nominatim usage policy (max 1 req/sec)
        
    return None, None

def main():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        
        # Get unique cities
        cities = list(set([f.city for f in festivals if f.city and f.city.lower() != "umbria"]))
        print(f"Found {len(cities)} unique cities to geocode.")
        
        city_coords = {}
        for city in cities:
            print(f"Geocoding: {city}...")
            lat, lon = get_coordinates(city)
            if lat and lon:
                city_coords[city] = (lat, lon)
                print(f" -> Success: {lat}, {lon}")
            else:
                print(f" -> Not Found")
                
        # Now update the festivals
        updated = 0
        for f in festivals:
            if f.city in city_coords:
                lat, lon = city_coords[f.city]
                # Only update if they differ significantly to avoid useless writes
                if f.latitude != lat or f.longitude != lon:
                    f.latitude = lat
                    f.longitude = lon
                    updated += 1
                    
        db.commit()
        print(f"Successfully updated coordinates for {updated} festivals.")
        
    finally:
        db.close()

if __name__ == '__main__':
    main()
