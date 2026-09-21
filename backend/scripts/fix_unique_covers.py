import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel
from collections import Counter

# Strictly 1-to-1 unique mapping by Festival ID or Name
ID_COVERS = {
    # Piccantissima (Pila) - Official poster
    "27eae5da-b698-4296-99d3-82515d038a75": "https://www.staserasagra.it/wp-content/uploads/2026/07/6a6c43b92751f.png",
    
    # Sagra della Bruschetta (Perugia) - Fontana Maggiore
    "6b51cc83-116f-4286-8470-701004f4eb14": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Fontana_maggiore_perugia_01.jpg/1280px-Fontana_maggiore_perugia_01.jpg",
    
    # Sagra dello Spaghetto (Perugia) - Collegio del Cambio
    "03fee889-ca62-4453-9cd2-cc5ed74cc2dd": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg",
    
    # Sagra del Piccione (Perugia) - Panorama Perugia
    "8493b215-9f92-4210-b466-04b7e7469d29": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Perugia_da_ascensori.jpg/1280px-Perugia_da_ascensori.jpg",

    # Balanzano 2026 - Official poster
    "d5d63d85-e5a0-4a63-b90e-eac127079d4e": "https://www.staserasagra.it/wp-content/uploads/2026/06/6a32555794592.png",

    # Guardea duplicate handling
    "50537638-50e3-466b-a945-b6c79dda2347": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/CARTOLINA_Di_GUARDEA.jpg/1280px-CARTOLINA_Di_GUARDEA.jpg",
    "412276a1-b542-4eac-8b29-d8f798c9b113": "https://www.sagreumbre.com/_data/upload/sagra-degli-gnocchi-guardea.jpg",

}

NAME_COVERS = {
    "Stramaialata - Sagra del Mangiar Bene": "https://www.sagreumbre.com/_data/upload/stramaialata-2.jpg",
    "Morra a Tutta Birra - Festa d'Estate": "https://www.umbriaeventi.com/storage/2026/07/eventi/evento/morra-a-tutta-birra-festa-d-estate-morra-4393-banner-1200x630-morra-a-tutta-birra.jpg",
    "Festa della Cipolla Cannara": "https://sagritaly.com/wp-content/uploads/festa-della-cipolla-cannara-2025.webp",
    "Sagra della Porchetta di Costano": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Costano_castello.JPG/1280px-Costano_castello.JPG",
    "Sagra dell'Oca": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/BettonaMar292024_03.jpg/1280px-BettonaMar292024_03.jpg",
    "Sagra degli Arrosticini": "https://www.sagreumbre.com/_data/upload/sagra-degli-arrosticini-1.jpg",
    "Sagra della Polenta e Salsicce": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Gubbio_dalla_funivia.jpg/1280px-Gubbio_dalla_funivia.jpg",
    "Festa di Sant'Anna": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Assisi_panorama_dalla_Rocca_Maggiore.jpg/1280px-Assisi_panorama_dalla_Rocca_Maggiore.jpg",
    "Festa della Battitura a Pietralunga": "https://upload.wikimedia.org/wikipedia/commons/6/64/Pietral3.jpg",
    "Sagra del Cinghiale a Sigillo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Sigillo-Panorama.jpg/1280px-Sigillo-Panorama.jpg",
    "Sagra della Frittella": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Gualdo_Cattaneo_vista.jpg/1280px-Gualdo_Cattaneo_vista.jpg",
    "Sagra degli Umbrichelli": "https://www.sagreumbre.com/_data/upload/sagra-degli-umbrichelli-1.jpg",
    "Mercato delle Gaite": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/BevagnaDec122023_03.jpg/1280px-BevagnaDec122023_03.jpg",
    "Mostra Mercato del Tartufo Nero": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Norcia_piazza_San_Benedetto.jpg/1280px-Norcia_piazza_San_Benedetto.jpg",
    "I Primi d'Italia": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Foligno_Piazza_della_Repubblica.jpg/1280px-Foligno_Piazza_della_Repubblica.jpg",
    "Enologica & Sagra del Sagrantino": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Montefalco_Piazza_del_Comune.jpg/1280px-Montefalco_Piazza_del_Comune.jpg",
    "Sagra della Pizza al Forno": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Ponte_di_Augusto_a_Narni.jpg/1280px-Ponte_di_Augusto_a_Narni.jpg",
    "Sagra della Polenta con le Lumache o ai Frutti di Mare": "https://www.umbriaeventi.com/storage/2026/07/eventi/evento/sagra-della-polenta-con-le-lumache-o-ai-frutti-di-mare-altidona-14389-1200x630fb-altidona-sagra-della-polenta.jpg",
    "Sagra della Patata Rossa": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1280px-Colfiorito.JPG",
    "Sagra delle Carni Tipiche Spoletine e della Frittella": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Spoleto_dalla_Rocca_Albornoziana.jpg/1280px-Spoleto_dalla_Rocca_Albornoziana.jpg",
    "Sagra del Cinghiale": "https://www.sagreumbre.com/_data/upload/sagra-del-cinghiale.jpg",
    "Sagra dell'Anatra": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Montecastrilli2007.JPG/1280px-Montecastrilli2007.JPG",
    "Antifestival": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Trevi_panorama.jpg/1280px-Trevi_panorama.jpg",

    "San Brizio 2026 – Sagra degli Gnocchi – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2026/06/6a32ca5c389db.png",
    "Marcellano VinCanta 2026 – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2026/06/6a3aa8bb7fbe6.png",
    "Casa del Diavolo 2026 – Diavoli in Festa + Devil Jamming Festival – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2026/07/6a5ddb217d6d2.png",
    "Casa del Diavolo 2025 – Diavoli in Festa – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2025/07/687e176966614.png",
    "Fratticiola Selvatica 2026 – Sagra dello spaghetto dei carbonai – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2026/07/6a59dd4be88c0.png",
    "Pierantonio e S. Orfeto in Festa 2026 – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2026/06/6a3aba2e3e685.png",
    "Case Nuove 2026 – Sagra degli Gnocchi – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2026/06/6a3255c731f61.png",
    "Marsciano 2026 – Palio delle Botti – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2026/06/6a2ab4e77838f.png",
    "Gaglietole in Festa 2025 – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2025/07/687a12bacefa7.png",
    "Castelnuovo 2026 – Festa di San Pasquale – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2026/04/69f0b36de803e.png",
    "Ripa 2026 – Sagra del tartufo – Stasera… Sagra!!": "https://www.staserasagra.it/wp-content/uploads/2026/06/6a3e88702956b.png",
}

def update_unique_covers():
    db: Session = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        updated = 0
        for f in festivals:
            fid = str(f.id)
            fname = f.name.strip()

            target = ID_COVERS.get(fid) or NAME_COVERS.get(fname)
            if not target:
                for k, v in NAME_COVERS.items():
                    if k.lower() in fname.lower():
                        target = v
                        break

            if target and f.image_url != target:
                f.image_url = target
                updated += 1

        db.commit()
        print(f"Updated {updated} records.")

        # Check duplicates
        all_f = db.query(FestivalModel).all()
        urls = [x.image_url for x in all_f if x.image_url]
        counts = Counter(urls)
        duplicates = {url: c for url, c in counts.items() if c > 1}
        print(f"Total festivals: {len(all_f)}")
        print(f"Duplicate image URLs count: {len(duplicates)}")
        if duplicates:
            print("Duplicates list:", duplicates)
        else:
            print("PERFECT SUCCESS: ZERO DUPLICATE IMAGES REMAINING!")
    finally:
        db.close()

if __name__ == '__main__':
    update_unique_covers()
