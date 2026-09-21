from app.core.database import SessionLocal
from app.models.festival import FestivalModel
from app.core.geo import validate_and_fix_coordinates, clean_location_name, get_official_coordinates
from app.core.cache import global_cache
import re

db = SessionLocal()
try:
    festivals = db.query(FestivalModel).all()
    updated_count = 0
    print(f'Starting structural coordinate verification for {len(festivals)} festivals...')

    for f in festivals:
        old_lat, old_lon = f.latitude, f.longitude
        old_city = f.city

        # 1. Clean up city naming anomalies
        clean_city = clean_location_name(f.city)
        if 'costano' in f.name.lower() and f.city.lower() == 'perugia':
            clean_city = 'Costano'
        elif 'monteleone' in f.city.lower():
            clean_city = "Monteleone d'Orvieto"
            f.province = 'TR'
        elif 'montecchio' in f.city.lower():
            clean_city = 'Montecchio'
            f.province = 'TR'
        elif 'sferracavallo' in f.city.lower():
            clean_city = 'Sferracavallo'
            f.province = 'TR'
        elif 'cave' in f.city.lower():
            clean_city = 'Cave'
        elif 'pretola' in f.city.lower():
            clean_city = 'Pretola'
        elif 'sant' in f.city.lower() and 'egidio' in f.city.lower():
            clean_city = "Sant'Egidio"
        elif 'sant' in f.city.lower() and 'eumenio' in f.city.lower():
            clean_city = "Sant'Eumenio"

        f.city = clean_city

        # 2. Re-resolve and fix coordinates
        fixed_lat, fixed_lon, corrected = validate_and_fix_coordinates(
            city=clean_city,
            province=f.province,
            latitude=old_lat,
            longitude=old_lon,
            max_tolerance_km=15.0,
            description=f.description or ''
        )

        if f.latitude != fixed_lat or f.longitude != fixed_lon or old_city != clean_city:
            print(f'Updated {f.name[:45]}: city \"{old_city}\" -> \"{clean_city}\", ({old_lat}, {old_lon}) -> ({fixed_lat}, {fixed_lon})')
            f.latitude = fixed_lat
            f.longitude = fixed_lon
            updated_count += 1

    db.commit()
    global_cache.invalidate_all()
    print(f'Completed: {updated_count} festivals structurally updated with accurate coordinates.')
finally:
    db.close()
