import re
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

KNOWN_CITIES = {
    "Casa del Diavolo": "PG",
    "Pozzo": "PG",
    "Gaglietole": "PG",
    "Pierantonio e S. Orfeto": "PG",
    "Pierantonio": "PG",
    "Castelnuovo": "PG",
    "Marcellano": "PG",
    "Grutti": "PG",
    "Fratticiola Selvatica": "PG",
    "Guardea": "TR",
    "Narni": "TR",
    "Norcia": "PG",
    "Bevagna": "PG",
    "Papiano": "PG",
    "Pila": "PG",
    "Cannaiola": "PG",
    "Case Nuove": "PG",
    "Bettona": "PG",
    "Ripa": "PG",
    "Balanzano": "PG",
    "Marsciano": "PG",
    "Foligno": "PG",
    "Gualdo Tadino": "PG",
    "Gualdo Cattaneo": "PG",
    "Pietralunga": "PG",
    "Pietrafitta": "PG",
    "Castiglion Fosco": "PG",
    "Ammeto": "PG",
    "Annifo": "PG",
    "Altidona": "TR",
    "Ponte San Lorenzo": "TR",
    "Gubbio": "PG",
    "Spoleto": "PG",
    "Perugia": "PG",
    "Assisi": "PG",
    "Magione": "PG",
    "Cannara": "PG",
    "Sigillo": "PG",
    "Monteleone Dorvieto": "TR",
    "Monteleone D'orvieto": "TR",
    "Fossato Di Vico": "PG",
    "Cerreto Di Spoleto": "PG",
    "Costano": "PG",
    "Montecastrilli": "TR",
    "Colfiorito": "PG",
    "Montefalco": "PG",
    "Baiano": "PG",
    "Morra": "PG",
    "Stroncone": "TR",
    "Montefranco": "TR",
    "Castiglione Del Lago": "PG"
}

def extract_city(name, url, current_city):
    name_clean = re.sub(r'^Festa di\s+', '', name, flags=re.IGNORECASE)
    m = re.match(r'^(.+?)(?:\s+in Festa|\s+VinCanta)?\s+(?:2024|2025|2026|2027)', name_clean, re.IGNORECASE)
    if m:
        c = m.group(1).strip()
        if c.lower() not in ['giugno', 'sagra', 'stasera', 'eventi, sagre e manifestazioni massa martana']:
            return c.title()
    
    if url:
        m2 = re.search(r'sagreumbre\.it/sagre/(?:pg|tr)/([^/]+)/', url)
        if m2:
            return m2.group(1).replace('-', ' ').title()
            
        m3 = re.search(r'-([a-z-]+)-\d+$', url)
        if m3:
            extracted = m3.group(1).replace('-', ' ').title()
            if extracted == 'Ponte San Lorenzo Di Narni': return 'Narni'
            if extracted == 'Taverne Di Serravalle Di Chienti': return 'Serravalle Di Chienti'
            if extracted == 'Montecchio Di Cortona': return 'Montecchio'
            return extracted
            
    if "Ammeto" in name: return "Ammeto"
    if "Stramaialata" in name: return "Castiglione Del Lago"
    if "I Primi d'Italia" in name: return "Foligno"
    if "Sagra della Tagliatella Fatta a Mano" in name: return "Gualdo Tadino"
    if "Festa della Rievocazione" in name: return "Gualdo Cattaneo"
    if "Battitura" in name and "Pietralunga" in name: return "Pietralunga"
    if "Ciriola" in name: return "Stroncone"
    if "Pizza Sotto Lu Focu" in name: return "Montefranco"
    if "Massa Martana" in name: return "Massa Martana"
    
    if not re.search(r'\d{4}', current_city) and current_city.lower() not in ['mare', 'montagna', 'autunno nel piatto', 'sagra frittella']:
        return current_city
        
    return "Umbria"

def main():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        updated = 0
        
        for f in festivals:
            old_city = f.city
            new_city = extract_city(f.name, f.source_url, f.city)
            
            if new_city == "Monteleone Dorvieto": new_city = "Monteleone D'Orvieto"
            if "Pierantonio" in new_city: new_city = "Pierantonio"
            if new_city == "Castelnovese": new_city = "Castelnuovo"
            
            prov = "PG"
            for k, v in KNOWN_CITIES.items():
                if k.lower() == new_city.lower():
                    prov = v
                    break
                    
            if new_city.lower() in ["narni", "guardea", "stroncone", "montefranco", "montecastrilli", "amelia", "terni", "orvieto"]:
                prov = "TR"
                
            if old_city != new_city or f.province != prov:
                print(f"Changing {f.name} | {old_city} -> {new_city} ({prov})")
                f.city = new_city
                f.province = prov
                updated += 1
                
        db.commit()
        print(f"Successfully updated {updated} cities.")
    finally:
        db.close()

if __name__ == '__main__':
    main()
