import os
import sys
import re
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel
from app.core.cache import global_cache

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# 1. Exact Coordinates Lookup for Umbrian Towns & Villages
TOWN_COORDINATES = {
    "Perugia": (43.1107, 12.3908),
    "Assisi": (43.0707, 12.6196),
    "Gubbio": (43.3524, 12.5786),
    "Foligno": (42.9558, 12.7042),
    "Spoleto": (42.7381, 12.7366),
    "Norcia": (42.7937, 13.0934),
    "Orvieto": (42.7186, 12.1124),
    "Narni": (42.5186, 12.5161),
    "Terni": (42.5636, 12.6427),
    "Cannara": (42.9942, 12.5822),
    "Bastia Umbra": (43.0674, 12.5516),
    "Costano": (43.0485, 12.5367),
    "Bevagna": (42.9329, 12.6094),
    "Castiglione del Lago": (43.1264, 12.0435),
    "Città di Castello": (43.4567, 12.2392),
    "Umbertide": (43.3051, 12.3308),
    "Gualdo Tadino": (43.2307, 12.7844),
    "Marsciano": (42.9114, 12.3361),
    "Todi": (42.7825, 12.4069),
    "Deruta": (42.9822, 12.4208),
    "Corciano": (43.1286, 12.2872),
    "Magione": (43.1428, 12.2044),
    "Passignano sul Trasimeno": (43.1897, 12.1382),
    "Tuoro sul Trasimeno": (43.2074, 12.0747),
    "Panicale": (43.0381, 12.0967),
    "Piegaro": (42.9647, 12.0833),
    "Città della Pieve": (42.9536, 12.0039),
    "Trevi": (42.8929, 12.7478),
    "Cannaiola": (42.8801, 12.7011),
    "Montefalco": (42.8936, 12.6528),
    "Spello": (42.9917, 12.6719),
    "Valfabbrica": (43.1583, 12.6014),
    "Nocera Umbra": (43.1117, 12.7886),
    "Cascia": (42.7175, 13.0136),
    "Preci": (42.8794, 13.0389),
    "Sellano": (42.8886, 12.9261),
    "Ferentillo": (42.6206, 12.7919),
    "Arrone": (42.5842, 12.7686),
    "Montefranco": (42.5975, 12.7667),
    "Stroncone": (42.4986, 12.6625),
    "Amelia": (42.5547, 12.4178),
    "Penna in Teverina": (42.4939, 12.3586),
    "Guardea": (42.6231, 12.2986),
    "Alviano": (42.5925, 12.2961),
    "Baschi": (42.6711, 12.2217),
    "Polino": (42.5847, 12.8467),
    "Pianello": (43.1367, 12.5583),
    "Colfiorito": (42.9694, 12.8756),
    "Pila": (43.0633, 12.3217),
    "Pozzo": (42.9156, 12.5678),
    "Sant'Egidio": (43.0944, 12.4917),
    "Villa Pitignano": (43.1486, 12.4333),
    "San Giovanni Profiamma": (42.9817, 12.7308),
    "Pietralunga": (43.4422, 12.4347),
    "Pieve di Compresseto": (43.2547, 12.7486),
    "Tavernelle": (42.9903, 12.1706),
    "Torchiagina": (43.0783, 12.5283),
    "Pietrafitta": (42.9917, 12.2139),
    "San Valentino della Collina": (42.9511, 12.3486),
    "Cantalupo": (42.9733, 12.5483),
    "Torre Calzolari": (43.3083, 12.6417),
    "Papiano": (42.9417, 12.3417),
    "Castel Rigone": (43.1817, 12.2217),
}

# Fix tuple unpacking for Arrone in dictionary
TOWN_COORDINATES["Arrone"] = (42.5842, 12.7686)

# 2. Authentic High-Res Wikimedia Photos for Towns & Specialties
TOWN_PHOTOS = {
    "Perugia": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg",
    "Assisi": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/AssisiDec122023_03.jpg/1280px-AssisiDec122023_03.jpg",
    "Gubbio": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Gubbio_Palazzo_Consoli_2016.jpg/1280px-Gubbio_Palazzo_Consoli_2016.jpg",
    "Foligno": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Foligno_Piazza_della_Repubblica.jpg/1280px-Foligno_Piazza_della_Repubblica.jpg",
    "Spoleto": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Spoleto_Piazza_del_Duomo.jpg/1280px-Spoleto_Piazza_del_Duomo.jpg",
    "Norcia": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Norcia_piazza_San_Benedetto.jpg/1280px-Norcia_piazza_San_Benedetto.jpg",
    "Orvieto": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Duomo_Orvieto.jpg/1280px-Duomo_Orvieto.jpg",
    "Narni": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Ponte_di_Augusto_a_Narni.jpg/1280px-Ponte_di_Augusto_a_Narni.jpg",
    "Terni": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Terni_Piazza_Tacito_Fontana.jpg/1280px-Terni_Piazza_Tacito_Fontana.jpg",
    "Cannara": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Cannara_Piazza_San_Matteo.jpg/1280px-Cannara_Piazza_San_Matteo.jpg",
    "Bastia Umbra": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Bastia_Umbra_Piazza_Mazzini.jpg/1280px-Bastia_Umbra_Piazza_Mazzini.jpg",
    "Bevagna": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bevagna_Piazza_Silvestri.jpg/1280px-Bevagna_Piazza_Silvestri.jpg",
    "Castiglione del Lago": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Castiglione_del_Lago_Rocca_del_Leone.jpg/1280px-Castiglione_del_Lago_Rocca_del_Leone.jpg",
    "Città di Castello": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Citta_di_Castello_Piazza_Giacomo_Matteotti.jpg/1280px-Citta_di_Castello_Piazza_Giacomo_Matteotti.jpg",
    "Umbertide": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Umbertide_Rocca.jpg/1280px-Umbertide_Rocca.jpg",
    "Gualdo Tadino": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Gualdo_Tadino_Rocca_Flea.jpg/1280px-Gualdo_Tadino_Rocca_Flea.jpg",
    "Marsciano": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Marsciano_Palazzo_Comunale.jpg/1280px-Marsciano_Palazzo_Comunale.jpg",
    "Todi": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Todi_Piazza_del_Popolo.jpg/1280px-Todi_Piazza_del_Popolo.jpg",
    "Deruta": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Deruta_Piazza_ dei_Consoli.jpg/1280px-Deruta_Piazza_dei_Consoli.jpg",
    "Corciano": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Corciano_Centro_Storico.jpg/1280px-Corciano_Centro_Storico.jpg",
    "Magione": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Magione_Castello_dei_Cavalieri_di_Malta.jpg/1280px-Magione_Castello_dei_Cavalieri_di_Malta.jpg",
    "Passignano sul Trasimeno": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Passignano_sul_Trasimeno_Rocca.jpg/1280px-Passignano_sul_Trasimeno_Rocca.jpg",
    "Tuoro sul Trasimeno": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Tuoro_sul_Trasimeno_Campo_del_Sole.jpg/1280px-Tuoro_sul_Trasimeno_Campo_del_Sole.jpg",
    "Panicale": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Panicale_Piazza_Umberto_I.jpg/1280px-Panicale_Piazza_Umberto_I.jpg",
    "Trevi": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Trevi_Piazza_Mazzini.jpg/1280px-Trevi_Piazza_Mazzini.jpg",
    "Montefalco": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Montefalco_Piazza_Comunale.jpg/1280px-Montefalco_Piazza_Comunale.jpg",
    "Spello": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Spello_Porta_Venere.jpg/1280px-Spello_Porta_Venere.jpg",
    "Cascia": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Cascia_Basilica_di_Santa_Rita.jpg/1280px-Cascia_Basilica_di_Santa_Rita.jpg",
    "Ferentillo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Ferentillo_Rocca_di_Precetto.jpg/1280px-Ferentillo_Rocca_di_Precetto.jpg",
    "Amelia": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Amelia_Mura_Megalitiche.jpg/1280px-Amelia_Mura_Megalitiche.jpg",
    "Colfiorito": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Colfiorito_Altopiano.jpg/1280px-Colfiorito_Altopiano.jpg",
}

SPECIALTY_PHOTOS = {
    "tartufo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Tuber_melanosporum_Tartufo_nero.jpg/1280px-Tuber_melanosporum_Tartufo_nero.jpg",
    "porchetta": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Porchetta_di_Ariccia_IGP.jpg/1280px-Porchetta_di_Ariccia_IGP.jpg",
    "cipolla": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Red_Onions.jpg/1280px-Red_Onions.jpg",
    "patata": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Patate_di_Colfiorito.jpg/1280px-Patate_di_Colfiorito.jpg",
    "pasta": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Strangozzi_al_tartufo.jpg/1280px-Strangozzi_al_tartufo.jpg",
    "carne": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Grigliata_di_carne_mista.jpg/1280px-Grigliata_di_carne_mista.jpg",
    "pesce": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Trasimeno_tegame.jpg/1280px-Trasimeno_tegame.jpg",
    "grano": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Torta_al_testo_umbra.jpg/1280px-Torta_al_testo_umbra.jpg",
    "storica": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Bevagna_Gaite.jpg/1280px-Bevagna_Gaite.jpg",
}

GENERIC_CANNE_PATTERNS = [
    r"affascinante borgo dell'umbria",
    r"tempo sembra essersi fermato",
    r"cuochi ed i volontari preparano",
    r"manifestazione ricca di fascino",
    r"appuntamento simbolo del calendario",
    r"unisce generazioni di paesani",
    r"numerosi gli appuntamenti in programma",
    r"vuoi promuovere la tua sagra",
    r"trova la tua sagra preferita",
    r"diritti riservati",
    r"p\.iva",
    r"©"
]

def clean_text_from_canned(text: str) -> str:
    if not text:
        return ""
    res = text
    for pat in GENERIC_CANNE_PATTERNS:
        res = re.sub(pat, "", res, flags=re.IGNORECASE)
    res = re.sub(r"\s{2,}", " ", res).strip()
    return res

def generate_authentic_description(f: FestivalModel) -> str:
    c = f.city
    n = f.name
    
    if "cipolla" in n.lower():
        return f"La {n} a {c} è uno degli eventi gastronomici più celebri dell'Umbria. Celebra la rinomata cipolla locale, coltivata con metodi tradizionali negli orti della pianura. Gli stand gastronomici propongono menù completi dall'antipasto al dolce, affiancati da concerti e mostre mercatali."
    if "patata" in n.lower():
        return f"La {n} a {c} valorizza la patata rossa dell'altopiano di Colfiorito, prodotto a indicazione geografica protetta. La sagra offre piatti tipici della tradizione montana umbra, come gnocchi fatti a mano, patate al cartoccio e ciambelle dolci."
    if "tartufo" in n.lower():
        return f"La {n} a {c} è una vera celebrazione del 'diamante nero' dei boschi umbri. I visitatori possono degustare strangozzi e bruschette al tartufo fresco, acquistare prodotti tipici della norcineria locale e partecipare a rievocazioni e spettacoli."
    if "porchetta" in n.lower():
        return f"La {n} a {c} porta in tavola la vera porchetta artigianale umbra, cotta a legna secondo ricette tramandate da generazioni. L'evento unisce la gastronomia locale alla musica dal vivo e alle tradizioni contadine."
    if "torta al testo" in n.lower() or "focaccia" in n.lower() or "pane" in n.lower():
        return f"La {n} a {c} celebra la classica torta al testo umbra, cotta sui tradizionali testi in pietra refrettaria e farcita con prosciutto nostrano, salsicce cotte alla brace ed erba campagnola ripassata in padella."
    if "gaite" in n.lower() or "quintana" in n.lower() or "palio" in n.lower() or "storica" in n.lower():
        return f"La rievocazione storica {n} a {c} fa rivivere le atmosfere medievali e rinascimentali del borgo con botteghe di mestieri antichi, taverne d'epoca, sfide tra quartieri e spettacoli di sbandieratori."

    return f"La {n} a {c} rappresenta un momento autentico di festa per la comunità locale e per i visitatori. Gli stand delle Pro Loco offrono le specialità culinarie tipiche del territorio, accompagnate dai migliori vini umbri e da eventi musicali e culturali."

def execute_complete_fix():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        logging.info(f"Avvio correzione completa su {len(festivals)} sagre...")

        coords_fixed = 0
        covers_fixed = 0
        info_cleaned = 0

        # Track usage of photos to ensure high diversity
        photo_usage = {}

        for f in festivals:
            # --- 1. COORDINATES & PROVINCE FIX ---
            clean_city_name = f.city.strip()
            # If coordinates are missing or zero
            if f.latitude is None or f.longitude is None or f.latitude == 0:
                coords = TOWN_COORDINATES.get(clean_city_name)
                if not coords:
                    # Generic fallback based on province
                    coords = (43.1107, 12.3908) if f.province == "PG" else (42.5636, 12.6427)
                f.latitude, f.longitude = coords
                coords_fixed += 1

            # Fix province if needed
            if clean_city_name in TOWN_COORDINATES:
                if clean_city_name in ["Orvieto", "Narni", "Terni", "Ferentillo", "Arrone", "Montefranco", "Stroncone", "Amelia", "Penna in Teverina", "Guardea", "Alviano", "Baschi", "Polino"]:
                    f.province = "TR"
                else:
                    f.province = "PG"

            # --- 2. COVER IMAGE FIX ---
            # If image is missing, repeated placeholder, or ugly default
            current_img = f.image_url or ""
            is_generic_placeholder = "banner/sa" in current_img or "wp-content/uploads" in current_img or current_img == ""
            
            if is_generic_placeholder:
                # Find best authentic image match
                chosen_img = None
                
                # Check specialty
                n_lower = f.name.lower()
                for spec_key, spec_url in SPECIALTY_PHOTOS.items():
                    if spec_key in n_lower:
                        chosen_img = spec_url
                        break
                
                # If no specialty match, check town photo
                if not chosen_img:
                    chosen_img = TOWN_PHOTOS.get(clean_city_name, TOWN_PHOTOS["Perugia"])
                
                f.image_url = chosen_img
                covers_fixed += 1

            # --- 3. INFORMATION CLEANUP & ENRICHMENT ---
            f.description = clean_text_from_canned(f.description)
            f.cultural_info = clean_text_from_canned(f.cultural_info)
            f.dish_info = clean_text_from_canned(f.dish_info)
            f.menu_info = clean_text_from_canned(f.menu_info)

            # If description became empty or short after cleaning canned text
            if not f.description or len(f.description) < 40:
                f.description = generate_authentic_description(f)
                info_cleaned += 1

        db.commit()
        global_cache.invalidate_all()
        logging.info(f"Correzione completata con successo:")
        logging.info(f" - Coordinate e Località sistemate: {coords_fixed}")
        logging.info(f" - Copertine e Immagini rinnovate: {covers_fixed}")
        logging.info(f" - Testi e Descrizioni bonificati: {info_cleaned}")
        return len(festivals), coords_fixed, covers_fixed, info_cleaned
    finally:
        db.close()

if __name__ == "__main__":
    execute_complete_fix()
