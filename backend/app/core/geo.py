"""
Registro delle coordinate geografiche ufficiali per i comuni e borghi dell'Umbria.
Fornisce funzioni di validazione e autocorrezione delle coordinate per garantire
che ogni sagra sia posizionata esattamente nel borgo segnalato.
"""

from typing import Tuple, Dict, Optional
import math

UMBRIA_TOWN_COORDINATES: Dict[str, Tuple[float, float]] = {
    # Province di Perugia (PG)
    "perugia": (43.1107, 12.3908),
    "assisi": (43.0707, 12.6196),
    "gubbio": (43.3555, 12.5769),
    "foligno": (42.9561, 12.7032),
    "spoleto": (42.7381, 12.7386),
    "norcia": (42.7931, 13.0931),
    "colfiorito": (43.0167, 12.9167),
    "bevagna": (42.9328, 12.6094),
    "montefalco": (42.8942, 12.6517),
    "cannara": (42.9944, 12.5833),
    "castiglione del lago": (43.1278, 12.0461),
    "bettona": (43.0142, 12.4853),
    "sigillo": (43.3325, 12.7417),
    "fossato di vico": (43.2967, 12.7619),
    "pietralunga": (43.4428, 12.4361),
    "balanzano": (43.0803, 12.4178),
    "pila": (43.0533, 12.3364),
    "pozzo": (42.9150, 12.5320),
    "baiano": (42.7167, 12.6833),
    "cannaiola": (42.8750, 12.6800),
    "marsciano": (42.9139, 12.3364),
    "umbertide": (43.3056, 12.3306),
    "todi": (42.7817, 12.4067),
    "gaglietole": (42.8930, 12.4510),
    "pietrafitta": (42.9910, 12.2150),
    "bastardo": (42.8767, 12.5633),
    "giano dell'umbria": (42.8333, 12.5833),
    "massa martana": (42.7950, 12.5233),
    "deruta": (42.9819, 12.4208),
    "panicale": (43.0378, 12.1406),
    "piegaro": (42.9667, 12.0833),
    "città di castello": (43.4567, 12.2389),
    "san giustino": (43.5500, 12.1833),
    "nocera umbra": (43.1122, 12.7892),
    "gualdo tadino": (43.2306, 12.7867),
    "valfabbrica": (43.1583, 12.6000),
    "costacciaro": (43.3611, 12.7611),
    "scheggia e pascelupo": (43.4033, 12.6667),
    "sellano": (42.8878, 12.9286),
    "cerreto di spoleto": (42.8167, 12.9167),
    "cascia": (42.7194, 13.0139),
    "poggiodomo": (42.7167, 12.9333),
    "monteleone di spoleto": (42.6500, 12.9500),
    "vallo di nera": (42.7547, 12.8653),
    "sant'anatolia di narco": (42.7333, 12.8333),
    "scheggino": (42.7139, 12.8306),
    "ferentillo": (42.6189, 12.7911),
    "arrone": (42.5833, 12.7667),
    "polino": (42.5833, 12.8500),
    "montefranco": (42.5972, 12.7667),
    "san gemini": (42.6139, 12.5472),
    "casteltodino": (42.6450, 12.5100),
    "otricoli": (42.4167, 12.4833),
    "calvi dell'umbria": (42.4033, 12.5667),
    "lugnano in teverina": (42.5744, 12.3308),
    "attigliano": (42.5114, 12.2936),
    "giove": (42.5083, 12.3306),
    "penna in teverina": (42.4944, 12.3625),
    "porano": (42.6861, 12.1006),
    "ficulle": (42.8333, 12.0667),
    "fabro": (42.8667, 12.0167),
    "allerona": (42.8117, 12.0006),
    "castel viscardo": (42.7556, 12.0000),
    "castel giorgio": (42.7000, 11.9833),
    "monteleone d'orvieto": (42.9167, 12.0500),
    "montegabbione": (42.9167, 12.0833),
    "parrano": (42.8667, 12.1000),
    "san venanzo": (42.8667, 12.2667),

    # Province di Terni (TR)
    "terni": (42.5619, 12.6481),
    "narni": (42.5181, 12.5153),
    "guardea": (42.6236, 12.2961),
    "montecastrilli": (42.6500, 12.4833),
    "orvieto": (42.7186, 12.1133),
    "amelia": (42.5539, 12.4172),
    "acquasparta": (42.6908, 12.5458)
}


def get_official_coordinates(city: str) -> Optional[Tuple[float, float]]:
    """Restituisce le coordinate ufficiali del borgo/comune specificato (se presente nel registro)."""
    if not city:
        return None
    normalized = city.strip().lower()
    
    # Check exact match first
    if normalized in UMBRIA_TOWN_COORDINATES:
        return UMBRIA_TOWN_COORDINATES[normalized]
        
    # Check if any key is contained in city (e.g. "Spoleto (frazione Baiano)" -> "spoleto" or "baiano")
    for key, coords in UMBRIA_TOWN_COORDINATES.items():
        if key in normalized or normalized in key:
            return coords
            
    return None


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcola la distanza approssimativa in KM tra due punti sulla Terra."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


import re

def resolve_location_from_text(city: str = "", description: str = "", province: str = "PG") -> Tuple[float, float]:
    """
    Auto-detects the town/location from city or description text and returns (latitude, longitude).
    Scans the description text for known Umbrian towns if city is empty or generic.
    """
    if city:
        coords = get_official_coordinates(city)
        if coords:
            return coords

    combined_text = f"{city} {description}".lower()
    for town_key, coords in UMBRIA_TOWN_COORDINATES.items():
        pattern = r'\b' + re.escape(town_key) + r'\b'
        if re.search(pattern, combined_text):
            return coords

    if province and province.upper() == "TR":
        return UMBRIA_TOWN_COORDINATES["terni"]
    return UMBRIA_TOWN_COORDINATES["perugia"]


def validate_and_fix_coordinates(city: str, province: str, latitude: float, longitude: float, max_tolerance_km: float = 12.0, description: str = "") -> Tuple[float, float, bool]:
    """
    Verifica che le coordinate fornite per una sagra siano entro la soglia di tolleranza
    rispetto alle coordinate del borgo/comune dichiarato o presente nella descrizione.
    
    Returns:
        (fixed_latitude, fixed_longitude, is_corrected)
    """
    if latitude is None or longitude is None or latitude == 0.0 or longitude == 0.0:
        off_lat, off_lon = resolve_location_from_text(city, description, province)
        return off_lat, off_lon, True

    official = get_official_coordinates(city)
    if not official:
        off_lat, off_lon = resolve_location_from_text(city, description, province)
        official = (off_lat, off_lon)

    off_lat, off_lon = official

    dist = haversine_distance_km(latitude, longitude, off_lat, off_lon)
    if dist > max_tolerance_km:
        return off_lat, off_lon, True

    return latitude, longitude, False

