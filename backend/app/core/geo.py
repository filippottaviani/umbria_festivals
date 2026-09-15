'''
Registro delle coordinate geografiche ufficiali per i comuni e borghi dell'Umbria.
Fornisce un motore di geocoding strutturale, intelligente ed end-to-end con:
- Normalizzazione toponimi ed estrazione automatica frazioni
- Registro ufficiale locale completo (92 comuni + centinaia di frazioni e borghi)
- Cache persistente su PostgreSQL (tabella geocode_cache) e cache in memoria
- Dynamic geocoding OpenStreetMap Nominatim scoped all'Umbria
- Rilevamento e autocorrezione sistematica dei falsi collassi su Perugia o Terni
'''

from typing import Tuple, Dict, Optional, Any
import math
import re
import json
import urllib.request
import urllib.parse
import logging

logger = logging.getLogger(__name__)

# Bounding box geografica rigorosa della regione Umbria
UMBRIA_BOUNDS = {
    'lat_min': 42.20,
    'lat_max': 43.80,
    'lon_min': 11.60,
    'lon_max': 13.60
}

# ─────────────────────────────────────────────────────────────────────────────
# REGISTRO COMPLETO: TUTTI I 92 COMUNI + PRINCIPALI FRAZIONI E BORGHI DELL'UMBRIA
# ─────────────────────────────────────────────────────────────────────────────
UMBRIA_TOWN_COORDINATES: Dict[str, Tuple[float, float]] = {
    # ── PROVINCIA DI PERUGIA: 59 COMUNI ──
    'perugia': (43.1107, 12.3908),
    'assisi': (43.0707, 12.6196),
    'bastia umbra': (43.0678, 12.5511),
    'bettona': (43.0142, 12.4853),
    'bevagna': (42.9328, 12.6094),
    'campello sul clitunno': (42.8222, 12.7758),
    'cannara': (42.9944, 12.5833),
    'cascia': (42.7194, 13.0139),
    'castel ritaldi': (42.8222, 12.6722),
    'castiglione del lago': (43.1278, 12.0461),
    'cerreto di spoleto': (42.8167, 12.9167),
    'citerna': (43.4989, 12.1158),
    'citta della pieve': (42.9531, 12.0044),
    'città della pieve': (42.9531, 12.0044),
    'citta di castello': (43.4567, 12.2389),
    'città di castello': (43.4567, 12.2389),
    'collazzone': (42.8931, 12.4286),
    'corciano': (43.1286, 12.2872),
    'costacciaro': (43.3611, 12.7611),
    'deruta': (42.9819, 12.4208),
    'foligno': (42.9561, 12.7032),
    'fossato di vico': (43.2967, 12.7619),
    'fratta todina': (42.8572, 12.3667),
    'giano dell umbria': (42.8333, 12.5833),
    'giano dell\'umbria': (42.8333, 12.5833),
    'gualdo cattaneo': (42.9114, 12.5544),
    'gualdo tadino': (43.2306, 12.7867),
    'gubbio': (43.3555, 12.5769),
    'lisciano niccone': (43.2500, 12.1500),
    'magione': (43.1428, 12.2042),
    'marsciano': (42.9139, 12.3364),
    'massa martana': (42.7758, 12.5273),
    'monte castello di vibio': (42.8378, 12.3508),
    'monte santa maria tiberina': (43.4372, 12.1611),
    'montefalco': (42.8942, 12.6517),
    'monteleone di spoleto': (42.6500, 12.9500),
    'montone': (43.3636, 12.3275),
    'nocera umbra': (43.1122, 12.7892),
    'norcia': (42.7931, 13.0931),
    'paciano': (43.0224, 12.0705),
    'panicale': (43.0378, 12.1406),
    'passignano sul trasimeno': (43.1897, 12.1386),
    'piegaro': (42.9667, 12.0833),
    'pietralunga': (43.4428, 12.4361),
    'poggiodomo': (42.7167, 12.9333),
    'preci': (42.8794, 13.0397),
    'san giustino': (43.5500, 12.1833),
    'sant anatolia di narco': (42.7333, 12.8333),
    'sant\'anatolia di narco': (42.7333, 12.8333),
    'scheggia e pascelupo': (43.4033, 12.6667),
    'scheggino': (42.7139, 12.8306),
    'sellano': (42.8878, 12.9286),
    'sigillo': (43.3325, 12.7417),
    'spello': (42.9922, 12.6719),
    'spoleto': (42.7381, 12.7386),
    'todi': (42.7817, 12.4067),
    'torgiano': (43.0253, 12.4339),
    'trevi': (42.8931, 12.7461),
    'tuoro sul trasimeno': (43.2069, 12.0758),
    'umbertide': (43.3056, 12.3306),
    'valfabbrica': (43.1583, 12.6000),
    'vallo di nera': (42.7547, 12.8653),
    'valtopina': (43.0569, 12.7533),

    # ── PROVINCIA DI TERNI: 33 COMUNI ──
    'terni': (42.5619, 12.6481),
    'acquasparta': (42.6908, 12.5458),
    'allerona': (42.8117, 12.0006),
    'alviano': (42.5908, 12.2961),
    'amelia': (42.5539, 12.4172),
    'arrone': (42.5833, 12.7667),
    'attigliano': (42.5114, 12.2936),
    'avigliano umbro': (42.6539, 12.4289),
    'baschi': (42.6739, 12.2217),
    'calvi dell umbria': (42.4033, 12.5667),
    'calvi dell\'umbria': (42.4033, 12.5667),
    'castel giorgio': (42.7000, 11.9833),
    'castel viscardo': (42.7556, 12.0000),
    'fabro': (42.8667, 12.0167),
    'ferentillo': (42.6189, 12.7911),
    'ficulle': (42.8333, 12.0667),
    'giove': (42.5083, 12.3306),
    'guardea': (42.6236, 12.2961),
    'lugnano in teverina': (42.5744, 12.3308),
    'montecastrilli': (42.6500, 12.4833),
    'montecchio': (42.6631, 12.2883),
    'montefranco': (42.5972, 12.7667),
    'montegabbione': (42.9167, 12.0833),
    'monteleone d orvieto': (42.8406, 12.0514),
    'monteleone d\'orvieto': (42.8406, 12.0514),
    'monteleone dorvieto': (42.8406, 12.0514),
    'narni': (42.5181, 12.5153),
    'orvieto': (42.7186, 12.1133),
    'otricoli': (42.4167, 12.4833),
    'parrano': (42.8667, 12.1000),
    'penna in teverina': (42.4944, 12.3625),
    'polino': (42.5833, 12.8500),
    'porano': (42.6861, 12.1006),
    'san gemini': (42.6139, 12.5472),
    'san venanzo': (42.8667, 12.2667),
    'stroncone': (42.4994, 12.6631),

    # ── BORGHI, FRAZIONI E LOCALITÀ ICONICHE DI SAGRE ──
    'pomonte': (42.9417, 12.5125),                     # Gualdo Cattaneo
    'pretola': (43.1147, 12.4394),                     # Perugia
    'sant\'egidio': (43.1044, 12.4910),                # Perugia
    'sant egidio': (43.1044, 12.4910),                 # Perugia
    'sant\'eumenio': (43.0850, 12.3650),               # Perugia (San Sisto)
    'sant eumenio': (43.0850, 12.3650),                # Perugia (San Sisto)
    'ripa': (43.1277, 12.5095),                        # Perugia
    'balanzano': (43.0767, 12.4239),                   # Perugia
    'pila': (43.0681, 12.3344),                        # Perugia
    'casa del diavolo': (43.1970, 12.4680),            # Perugia
    'fratticiola selvatica': (43.2080, 12.5530),       # Perugia
    'ponte felcino': (43.1436, 12.4464),               # Perugia
    'ponte pattoli': (43.1814, 12.4439),               # Perugia
    'ponte san giovanni': (43.0903, 12.4456),          # Perugia
    'ponte valleceppi': (43.1278, 12.4556),            # Perugia
    'san martino in colle': (43.0361, 12.3789),        # Perugia
    'san fortunato della collina': (43.0569, 12.4042), # Perugia
    'san sisto': (43.0861, 12.3556),                   # Perugia
    'castel del piano': (43.0642, 12.3278),            # Perugia
    'collestrada': (43.0850, 12.4583),                 # Perugia
    'colombella': (43.1611, 12.4972),                  # Perugia
    'piccione': (43.1972, 12.5194),                    # Perugia
    'ramazzano': (43.1750, 12.4778),                   # Perugia
    'bosco': (43.1694, 12.4639),                       # Perugia
    'fontignano': (43.0278, 12.1944),                  # Perugia
    'mugnano': (43.0489, 12.2181),                     # Perugia
    'pianello': (43.1361, 12.5489),                    # Perugia
    'pierantonio': (43.2650, 12.3360),                 # Umbertide
    'pierantonio e s. orfeto': (43.2650, 12.3360),     # Umbertide
    'montecastelli': (43.3556, 12.2889),               # Umbertide
    'niccone': (43.3139, 12.2944),                     # Umbertide
    'preggio': (43.2528, 12.2333),                     # Umbertide
    'calzolaro': (43.3694, 12.2694),                   # Umbertide
    'castelnuovo': (43.0308, 12.5846),                 # Assisi
    'castelnuovo di assisi': (43.0308, 12.5846),        # Assisi
    'santa maria degli angeli': (43.0583, 12.5806),    # Assisi
    'rivotorto': (43.0486, 12.6167),                   # Assisi
    'petrignano': (43.1092, 12.5336),                  # Assisi
    'palazzo di assisi': (43.0978, 12.5856),           # Assisi
    'torchiagina': (43.0806, 12.5694),                 # Assisi
    'armenzano': (43.0917, 12.6944),                   # Assisi
    'costano': (43.0336, 12.5647),                     # Bastia Umbra
    'ospedalicchio': (43.0811, 12.5139),               # Bastia Umbra
    'case nuove': (42.9250, 12.8330),                  # Foligno
    'cave': (42.9836, 12.6789),                        # Foligno
    'colfiorito': (43.0167, 12.9167),                  # Foligno
    'annifo': (43.0200, 12.8460),                      # Foligno
    'sant\'eraclio': (42.9278, 12.7167),               # Foligno
    'san giovanni profiamma': (42.9861, 12.7306),      # Foligno
    'vescia': (42.9833, 12.7278),                      # Foligno
    'belfiore': (42.9722, 12.7417),                    # Foligno
    'pale': (42.9833, 12.7833),                        # Foligno
    'capodacqua': (43.0083, 12.7833),                  # Foligno
    'rasiglia': (42.9567, 12.8550),                    # Foligno
    'pozzo': (42.8711, 12.5317),                       # Gualdo Cattaneo
    'grutti': (42.8600, 12.4840),                      # Gualdo Cattaneo
    'marcellano': (42.8560, 12.4850),                  # Gualdo Cattaneo
    'san terenziano': (42.8944, 12.4939),              # Gualdo Cattaneo
    'gaglietole': (42.8647, 12.4639),                  # Collazzone
    'bastardo': (42.8767, 12.5633),                    # Giano dell'Umbria
    'san brizio': (42.7911, 12.6847),                  # Spoleto
    'baiano': (42.6989, 12.6981),                      # Spoleto
    'san martino in trignano': (42.7567, 12.6833),     # Spoleto
    'cannaiola': (42.8681, 12.6289),                   # Trevi
    'borgo trevi': (42.8833, 12.7167),                 # Trevi
    'pietrafitta': (42.9903, 12.2131),                 # Piegaro
    'castiglion fosco': (42.9690, 12.1930),            # Piegaro
    'tavernelle': (42.9892, 12.1706),                  # Panicale
    'castel rigone': (43.2139, 12.2389),               # Passignano
    'san feliciano': (43.1181, 12.1694),               # Magione
    'monte del lago': (43.1439, 12.1639),              # Magione
    'sant\'arcangelo': (43.0889, 12.1528),             # Magione
    'agello': (43.0889, 12.2306),                      # Magione
    'torricella': (43.1639, 12.1750),                  # Magione
    'san mariano': (43.0972, 12.3167),                 # Corciano
    'ellera': (43.1083, 12.3306),                      # Corciano
    'solomeo': (43.0806, 12.2806),                     # Corciano
    'mantignana': (43.1556, 12.3083),                  # Corciano
    'ammeto': (42.9180, 12.3350),                      # Marsciano
    'papiano': (42.9329, 12.3551),                     # Marsciano
    'morra': (43.4114, 12.1008),                       # Città di Castello
    'trestina': (43.3639, 12.2389),                    # Città di Castello
    'cerbara': (43.4861, 12.2306),                     # Città di Castello
    'san secondo': (43.4306, 12.2389),                 # Città di Castello
    'promano': (43.3750, 12.2611),                     # Città di Castello
    'sferracavallo': (42.7239, 12.0986),               # Orvieto
    'ciconia': (42.7308, 12.1333),                     # Orvieto
    'prodo': (42.7667, 12.2167),                       # Orvieto
    'morrano': (42.7483, 12.1817),                     # Orvieto
    'casteltodino': (42.6450, 12.5100),                # Montecastrilli
    'castel dell\'aquila': (42.6075, 12.4431),         # Montecastrilli
    'castel dellaquila': (42.6075, 12.4431),          # Montecastrilli
    'quadrelli': (42.6283, 12.4925),                   # Montecastrilli
    'farnetta': (42.6567, 12.4567),                    # Montecastrilli
    'tenaglie': (42.6597, 12.2981),                    # Montecchio
    'melezzole': (42.6739, 12.3789),                   # Montecchio
    'civitella del lago': (42.6931, 12.2856),          # Baschi
    'collescipoli': (42.5361, 12.6194),                # Terni
    'piediluco': (42.5333, 12.7500),                   # Terni
    'marmore': (42.5500, 12.7167),                     # Terni
    'papigno': (42.5539, 12.6861),                     # Terni
    'ponte san lorenzo': (42.5408, 12.5697),           # Narni
    'nera montoro': (42.5028, 12.4833),                # Narni
    'fornole': (42.5450, 12.4417),                     # Amelia
    'sambucetole': (42.6000, 12.4167),                 # Amelia
    'castelluccio': (42.8281, 13.2064),                # Norcia
    'castelluccio di norcia': (42.8281, 13.2064),       # Norcia
    'borgo cerreto': (42.8222, 12.9056),               # Cerreto di Spoleto
    'castel san felice': (42.7333, 12.8361),           # Sant'Anatolia di Narco
    'postignano': (42.8917, 12.9472),                  # Sellano
    'cupramontana': (43.4449, 13.1171),                # Evento storico di confine
}

_GEOCODE_CACHE: Dict[str, Tuple[float, float]] = {}


def clean_location_name(text: str) -> str:
    '''Normalizza e ripulisce il nome della città/borgo rimuovendo prefissi e refusi.'''
    if not text:
        return ''
    s = text.replace('\\\'', '\'').replace('\\', '').strip()
    
    # Rimuovi prefissi tipici di eventi o sagre che per errore finiscono nel campo città
    s = re.sub(
        r'^(?:sagra|festa|fiera|palio|rievocazione|rassegna|notte)\s+(?:degli|della|delle|dello|del|dell\'|de\'|di|d\')?\s*[^,]+\s+(?:a|in|di)\s+',
        '',
        s,
        flags=re.IGNORECASE
    )
    s = re.sub(
        r'^(?:degli|della|delle|dello|del|dell\'|de\')\s+[^,]+\s+(monteleone\s+d[\'\s]?orvieto|montecchio|pretola|sferracavallo|cave|cupramontana|pomonte|castelnuovo|san\s+terenziano|piediluco|costano)',
        r'\1',
        s,
        flags=re.IGNORECASE
    )
    # Rimuovi diciture come 'frazione', 'fraz.', 'località', 'loc.'
    s = re.sub(r'^(?:frazione|fraz\.|località|loc\.)\s+', '', s, flags=re.IGNORECASE)
    
    # Rimuovi suffissi di provincia (es. ' (PG)', ' - PG', ' PG', ' (Perugia)')
    s = re.sub(r'[\s,\-]+(?:PG|TR|Perugia|Terni)\s*$', '', s, flags=re.IGNORECASE)
    s = re.sub(r'\s*\((?:PG|TR|Perugia|Terni)\)\s*$', '', s, flags=re.IGNORECASE)
    return s.strip()


def get_cached_db_coordinates(query: str, db: Optional[Any] = None) -> Optional[Tuple[float, float, str]]:
    '''Cerca le coordinate memorizzate in precedenza nella tabella geocode_cache.'''
    clean_q = query.strip().lower()
    close_db = False
    if db is None:
        try:
            from app.core.database import SessionLocal
            db = SessionLocal()
            close_db = True
        except Exception:
            return None
    try:
        from app.models.geocode import GeocodeCacheModel
        entry = db.query(GeocodeCacheModel).filter(GeocodeCacheModel.query == clean_q).first()
        if entry:
            return (entry.latitude, entry.longitude, entry.resolved_name or entry.query)
    except Exception as e:
        logger.debug(f"DB geocode lookup failed for {query}: {e}")
    finally:
        if close_db and db:
            db.close()
    return None


def save_cached_db_coordinates(query: str, lat: float, lon: float, resolved_name: str = '', source: str = 'nominatim', db: Optional[Any] = None) -> None:
    '''Salva in modo permanente le coordinate risolte nella tabella geocode_cache.'''
    clean_q = query.strip().lower()
    close_db = False
    if db is None:
        try:
            from app.core.database import SessionLocal
            db = SessionLocal()
            close_db = True
        except Exception:
            return
    try:
        from app.models.geocode import GeocodeCacheModel
        entry = db.query(GeocodeCacheModel).filter(GeocodeCacheModel.query == clean_q).first()
        if not entry:
            entry = GeocodeCacheModel(
                query=clean_q,
                latitude=lat,
                longitude=lon,
                resolved_name=resolved_name or query.title(),
                source=source
            )
            db.add(entry)
            db.commit()
    except Exception as e:
        logger.debug(f"DB geocode save failed for {query}: {e}")
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        if close_db and db:
            db.close()


def geocode_online(query: str, db: Optional[Any] = None) -> Optional[Tuple[float, float]]:
    '''
    Esegue geocoding dinamico tramite OpenStreetMap Nominatim scoped rigidamente all'Umbria.
    I risultati validi vengono salvati sia in memoria che nella tabella geocode_cache.
    '''
    clean_q = query.strip().lower()
    if clean_q in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[clean_q]

    # Controlla nella cache su database
    cached_db = get_cached_db_coordinates(clean_q, db=db)
    if cached_db:
        coords = (cached_db[0], cached_db[1])
        _GEOCODE_CACHE[clean_q] = coords
        return coords

    # Richiesta Nominatim con bounding box Umbria
    url = f'https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(query)}&viewbox=11.6,43.8,13.6,42.2&bounded=0&limit=1'
    req = urllib.request.Request(url, headers={'User-Agent': 'UmbriaFestivals/2.0 (info@sagraumbra.it)'})
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                if UMBRIA_BOUNDS['lat_min'] <= lat <= UMBRIA_BOUNDS['lat_max'] and UMBRIA_BOUNDS['lon_min'] <= lon <= UMBRIA_BOUNDS['lon_max']:
                    res = (round(lat, 4), round(lon, 4))
                    _GEOCODE_CACHE[clean_q] = res
                    save_cached_db_coordinates(clean_q, res[0], res[1], resolved_name=data[0].get('display_name', ''), source='nominatim', db=db)
                    return res
    except Exception as e:
        logger.debug(f'Online geocoding failed for {query}: {e}')
    return None


def get_official_coordinates(
    city: str = '',
    province: str = '',
    description: str = '',
    db: Optional[Any] = None
) -> Optional[Tuple[float, float]]:
    '''
    Restituisce le coordinate geografiche esatte del borgo o comune umbro.
    1. Ricerca diretta nel gazetteer locale (92 comuni + centinaia di frazioni)
    2. Ricerca in cache di memoria e tabella geocode_cache su PostgreSQL
    3. Ricerca per corrispondenza di frazione o toponimo composto
    4. Geocoding dinamico OpenStreetMap Nominatim scoped all'Umbria
    5. Scansione toponimi nella descrizione dell'evento
    '''
    if city:
        cleaned = clean_location_name(city)
        normalized = cleaned.lower()
        
        # 1. Ricerca diretta esatta nel registro locale
        if normalized in UMBRIA_TOWN_COORDINATES:
            return UMBRIA_TOWN_COORDINATES[normalized]

        # 2. Controllo cache memoria
        if normalized in _GEOCODE_CACHE:
            return _GEOCODE_CACHE[normalized]

        # 3. Controllo cache persistente su database
        db_res = get_cached_db_coordinates(normalized, db=db)
        if db_res:
            res = (db_res[0], db_res[1])
            _GEOCODE_CACHE[normalized] = res
            return res

        # 4. Ricerca per corrispondenza di frazione o comune composto
        for key, coords in UMBRIA_TOWN_COORDINATES.items():
            if key == normalized:
                return coords
            if len(key) >= 4 and (f' {key} ' in f' {normalized} ' or normalized.startswith(f'{key} ') or normalized.endswith(f' {key}')):
                return coords

        # 5. Geocoding dinamico online con bounding box Umbria
        online_coords = geocode_online(f'{cleaned}, Umbria, Italia', db=db)
        if online_coords:
            UMBRIA_TOWN_COORDINATES[normalized] = online_coords
            return online_coords

        if province:
            online_coords = geocode_online(f'{cleaned}, {province.upper()}, Italia', db=db)
            if online_coords:
                UMBRIA_TOWN_COORDINATES[normalized] = online_coords
                return online_coords

    # 6. Scansiona il testo della descrizione per individuare borghi umbri noti
    if description:
        desc_lower = description.lower()
        for town_key, coords in UMBRIA_TOWN_COORDINATES.items():
            if len(town_key) >= 4:
                pattern = r'\b' + re.escape(town_key) + r'\b'
                if re.search(pattern, desc_lower):
                    return coords

    return None


def resolve_geocoding(
    query: str,
    province: str = 'PG',
    description: str = '',
    db: Optional[Any] = None
) -> Dict[str, Any]:
    '''
    Risolve le coordinate fornendo metadati completi di provenienza e confidenza.
    Ideale per gli endpoint API di geolocalizzazione e per i form amministrativi.
    '''
    cleaned = clean_location_name(query)
    normalized = cleaned.lower()

    if normalized in UMBRIA_TOWN_COORDINATES:
        lat, lon = UMBRIA_TOWN_COORDINATES[normalized]
        return {
            "query": query,
            "cleaned_query": cleaned,
            "latitude": lat,
            "longitude": lon,
            "resolved_name": cleaned.title(),
            "source": "gazetteer",
            "is_valid_umbria": True,
            "confidence": 1.0
        }

    db_res = get_cached_db_coordinates(normalized, db=db)
    if db_res:
        return {
            "query": query,
            "cleaned_query": cleaned,
            "latitude": db_res[0],
            "longitude": db_res[1],
            "resolved_name": db_res[2],
            "source": "db_cache",
            "is_valid_umbria": True,
            "confidence": 0.95
        }

    coords = get_official_coordinates(query, province=province, description=description, db=db)
    if coords:
        return {
            "query": query,
            "cleaned_query": cleaned,
            "latitude": coords[0],
            "longitude": coords[1],
            "resolved_name": cleaned.title(),
            "source": "nominatim_or_match",
            "is_valid_umbria": True,
            "confidence": 0.90
        }

    # Fallback ragionato (evitando false attribuzioni al capoluogo se non esplicitamente richiesto)
    is_tr = bool(province and province.upper() == 'TR')
    fallback_coords = UMBRIA_TOWN_COORDINATES['terni'] if is_tr else UMBRIA_TOWN_COORDINATES['perugia']
    return {
        "query": query,
        "cleaned_query": cleaned,
        "latitude": fallback_coords[0],
        "longitude": fallback_coords[1],
        "resolved_name": "Terni (Capoluogo Prov.)" if is_tr else "Perugia (Capoluogo Reg.)",
        "source": "province_fallback",
        "is_valid_umbria": True,
        "confidence": 0.30
    }


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    '''Calcola la distanza in KM tra due coordinate geografiche (WGS84).'''
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def resolve_location_from_text(city: str = '', description: str = '', province: str = 'PG', db: Optional[Any] = None) -> Tuple[float, float]:
    '''Risolve la posizione geografica a partire dal nome o dal testo dell'evento.'''
    coords = get_official_coordinates(city, province=province, description=description, db=db)
    if coords:
        return coords

    if province and province.upper() == 'TR':
        return UMBRIA_TOWN_COORDINATES['terni']
    return UMBRIA_TOWN_COORDINATES['perugia']


def is_in_umbria(latitude: Optional[float], longitude: Optional[float]) -> bool:
    '''Verifica se una coppia di coordinate si trova entro i confini geografici dell'Umbria.'''
    if latitude is None or longitude is None:
        return False
    if latitude == 0.0 and longitude == 0.0:
        return False
    return (
        UMBRIA_BOUNDS['lat_min'] <= latitude <= UMBRIA_BOUNDS['lat_max'] and
        UMBRIA_BOUNDS['lon_min'] <= longitude <= UMBRIA_BOUNDS['lon_max']
    )


def validate_and_fix_coordinates(
    city: str,
    province: str,
    latitude: Optional[float],
    longitude: Optional[float],
    max_tolerance_km: float = 15.0,
    description: str = '',
    db: Optional[Any] = None
) -> Tuple[float, float, bool]:
    '''
    Valida e autocorregge le coordinate geografiche della sagra in maniera strutturale:
    - Se le coordinate fornite sono valide e corrispondono al borgo, le mantiene invariate.
    - Se sono assenti, nulle, fuori regione o palesemente errate (>15km rispetto al borgo effettivo),
      le corregge posizionandole con precisione nel borgo reale.
    - Se le coordinate sono il valore di default del capoluogo (Perugia o Terni) ma la sagra
      si svolge in un borgo o frazione specifico, assegna le coordinate esatte del borgo.
    - Se il borgo non è noto ma le coordinate sono già entro i confini umbri, preserva le coordinate.
    '''
    coords_valid = is_in_umbria(latitude, longitude)
    official = get_official_coordinates(city, province=province, description=description, db=db)

    if official:
        off_lat, off_lon = official
        if not coords_valid:
            return off_lat, off_lon, True

        # Controlla se le coordinate attuali sono il fallback generico del capoluogo
        cleaned_c = clean_location_name(city).lower()
        is_generic_capital = (
            abs(latitude - 43.1107) < 0.001 and abs(longitude - 12.3908) < 0.001
        ) or (
            abs(latitude - 42.5619) < 0.002 and abs(longitude - 12.6481) < 0.002
        ) or (
            abs(latitude - 42.7186) < 0.002 and abs(longitude - 12.1133) < 0.002 and 'monteleone' in cleaned_c
        )

        if is_generic_capital and cleaned_c not in ['perugia', 'terni']:
            # Sposta al borgo reale anche se dista meno di 15km dal capoluogo
            return off_lat, off_lon, True

        # Se dista più della tolleranza dal borgo ufficiale dichiarato
        dist = haversine_distance_km(latitude, longitude, off_lat, off_lon)
        if dist > max_tolerance_km:
            return off_lat, off_lon, True

        return latitude, longitude, False

    # Se il borgo specifico non è stato identificato con certezza:
    if coords_valid:
        # NON sovrascrivere coordinate valide con Perugia!
        return latitude, longitude, False

    # Solo come estrema risorsa se le coordinate sono completamente nulle/invalide:
    fallback_lat, fallback_lon = resolve_location_from_text(city, description, province, db=db)
    return fallback_lat, fallback_lon, True
