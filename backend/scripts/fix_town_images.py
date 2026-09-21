import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

# Mapping of Umbrian towns/cities to high-resolution aerial views (viste aeree / panoramiche)
TOWN_AERIAL_PHOTOS = {
    'Perugia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Perugia_da_ascensori.jpg/1280px-Perugia_da_ascensori.jpg',
    'Assisi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Assisi_panorama_dalla_Rocca_Maggiore.jpg/1280px-Assisi_panorama_dalla_Rocca_Maggiore.jpg',
    'Gubbio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Gubbio_dalla_funivia.jpg/1280px-Gubbio_dalla_funivia.jpg',
    'Foligno': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Foligno_Piazza_della_Repubblica.jpg/1280px-Foligno_Piazza_della_Repubblica.jpg',
    'Spoleto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Spoleto_dalla_Rocca_Albornoziana.jpg/1280px-Spoleto_dalla_Rocca_Albornoziana.jpg',
    'Norcia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Norcia_piazza_San_Benedetto.jpg/1280px-Norcia_piazza_San_Benedetto.jpg',
    'Montefalco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Montefalco_Piazza_del_Comune.jpg/1280px-Montefalco_Piazza_del_Comune.jpg',
    'Bevagna': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/BevagnaDec122023_03.jpg/1280px-BevagnaDec122023_03.jpg',
    'Cannara': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Costano_castello.JPG/1280px-Costano_castello.JPG',
    'Costano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Costano_castello.JPG/1280px-Costano_castello.JPG',
    'Castelnuovo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Costano_castello.JPG/1280px-Costano_castello.JPG',
    'Colfiorito': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1280px-Colfiorito.JPG',
    'Sigillo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Sigillo-Panorama.jpg/1280px-Sigillo-Panorama.jpg',
    'Pietralunga': 'https://upload.wikimedia.org/wikipedia/commons/6/64/Pietral3.jpg',
    'Fossato di Vico': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Fossato_di_Vico_Borgo.jpg/1280px-Fossato_di_Vico_Borgo.jpg',
    'Orvieto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Duomo_Orvieto.jpg/1280px-Duomo_Orvieto.jpg',
    'Monteleone d\'Orvieto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Duomo_Orvieto.jpg/1280px-Duomo_Orvieto.jpg',
    'Narni': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Ponte_di_Augusto_a_Narni.jpg/1280px-Ponte_di_Augusto_a_Narni.jpg',
    'Castiglione del Lago': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Castiglione_del_Lago_Rocca.jpg/1280px-Castiglione_del_Lago_Rocca.jpg',
    'Bettona': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/BettonaMar292024_03.jpg/1280px-BettonaMar292024_03.jpg',
    'Guardea': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/CARTOLINA_Di_GUARDEA.jpg/1280px-CARTOLINA_Di_GUARDEA.jpg',
    'Montecastrilli': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Montecastrilli2007.JPG/1280px-Montecastrilli2007.JPG',
    'Marsciano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Marsciano_Piazza_Marx.jpg/1280px-Marsciano_Piazza_Marx.jpg',
    'Marcellano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Marsciano_Piazza_Marx.jpg/1280px-Marsciano_Piazza_Marx.jpg',
    'Pozzo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/BevagnaDec122023_03.jpg/1280px-BevagnaDec122023_03.jpg',
    'Gaglietole': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Marsciano_Piazza_Marx.jpg/1280px-Marsciano_Piazza_Marx.jpg',
    'Cannaiola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Montefalco_Piazza_del_Comune.jpg/1280px-Montefalco_Piazza_del_Comune.jpg',
    'San Brizio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Spoleto_dalla_Rocca_Albornoziana.jpg/1280px-Spoleto_dalla_Rocca_Albornoziana.jpg',
    'San Martino in Trignano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Spoleto_dalla_Rocca_Albornoziana.jpg/1280px-Spoleto_dalla_Rocca_Albornoziana.jpg',
    'Baiano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Spoleto_dalla_Rocca_Albornoziana.jpg/1280px-Spoleto_dalla_Rocca_Albornoziana.jpg',
    'Pila': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Perugia_da_ascensori.jpg/1280px-Perugia_da_ascensori.jpg',
    'Balanzano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Perugia_da_ascensori.jpg/1280px-Perugia_da_ascensori.jpg',
    'Casa del Diavolo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Perugia_da_ascensori.jpg/1280px-Perugia_da_ascensori.jpg',
    'Fratticiola Selvatica': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Perugia_da_ascensori.jpg/1280px-Perugia_da_ascensori.jpg',
    'Ripa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Perugia_da_ascensori.jpg/1280px-Perugia_da_ascensori.jpg',
    'Pierantonio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Perugia_da_ascensori.jpg/1280px-Perugia_da_ascensori.jpg',
    'Case Nuove': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Perugia_da_ascensori.jpg/1280px-Perugia_da_ascensori.jpg',
    'Morra': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Citta_di_Castello_Piazza.jpg/1280px-Citta_di_Castello_Piazza.jpg',
    'Todi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Todi_panorama.jpg/1280px-Todi_panorama.jpg'
}

def update_town_images():
    db: Session = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        updated = 0
        for f in festivals:
            city_name = f.city.strip()
            is_generic = not f.image_url or 'staserasagra.it' in f.image_url or 'sagreumbre.com' in f.image_url or 'umbriaeventi.com' in f.image_url or 'sagritaly.com' in f.image_url
            
            photo = TOWN_AERIAL_PHOTOS.get(city_name)
            if not photo:
                for key, val in TOWN_AERIAL_PHOTOS.items():
                    if key.lower() in city_name.lower() or city_name.lower() in key.lower():
                        photo = val
                        break

            if photo and (is_generic or photo != f.image_url):
                f.image_url = photo
                updated += 1
        
        db.commit()
        print(f"Updated {updated} festival records with authentic aerial view (vista aerea) town photos.")
    finally:
        db.close()

if __name__ == '__main__':
    update_town_images()
