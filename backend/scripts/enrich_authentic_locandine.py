import os
import re
import ssl
import urllib.request
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

if not os.getenv("DATABASE_URL"):
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    os.environ["DATABASE_URL"] = line.split("=", 1)[1].strip()
    if not os.getenv("DATABASE_URL"):
        os.environ["DATABASE_URL"] = "postgresql://postgres:password@localhost:5432/umbriafestivals"

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
}

EXCLUDE_KEYWORDS = [
    'banner', 'logo', 'qrcode', 'simar', 'doorself', 'srp-ecologia', 
    'partner', 'newsletter', 'facebook', 'instagram', 'avatar', 'whatsapp', 
    'button', 'badge', 'px.gif', '1x1', 'cropped-logo', '32x32', '180x180', 
    '192x192', '270x270', 'bar.svg', 'texture', 'group-263'
]

def check_image_reachable(url: str, timeout: int = 5) -> bool:
    if not url:
        return False
    try:
        req = urllib.request.Request(url, headers=HEADERS, method='HEAD')
        resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        return resp.status == 200
    except Exception:
        try:
            req = urllib.request.Request(url, headers=HEADERS, method='GET')
            resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
            return resp.status == 200
        except Exception:
            return False

def extract_authentic_locandina(source_url: str, festival_name: str) -> str:
    if not source_url:
        return None
    try:
        req = urllib.request.Request(source_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6, context=ctx) as r:
            html = r.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')

            # 1. UMBRIAEVENTI
            if 'umbriaeventi.com' in source_url:
                words = [w.lower() for w in re.findall(r'\b[a-zA-Zàèéìòù]{4,}\b', festival_name) 
                         if w.lower() not in ['sagra', 'festa', 'della', 'delle', 'degli', 'dell', 'borgo', 'notti', 'mostra', 'mercato']]
                candidates = []
                for img in soup.find_all('img'):
                    src = img.get('src') or ''
                    alt = (img.get('alt') or '').lower()
                    if not src or any(b in src.lower() for b in EXCLUDE_KEYWORDS):
                        continue
                    if 'resourcesdyn' in src or 'storage' in src:
                        score = sum(3 for w in words if w in alt)
                        if any(k in src.lower() for k in ['locandina', 'poster', 'manifesto', 'evento']):
                            score += 2
                        if any(k in src.lower() for k in ['sagra', 'festa']):
                            score += 1
                        candidates.append((score, src))
                if candidates:
                    candidates.sort(key=lambda x: x[0], reverse=True)
                    best_url = candidates[0][1]
                    if not best_url.startswith('http'):
                        best_url = urllib.parse.urljoin(source_url, best_url)
                    if check_image_reachable(best_url):
                        return best_url

            # 2. STASERASAGRA
            elif 'staserasagra.it' in source_url:
                candidates = []
                for img in soup.find_all('img'):
                    src = img.get('src') or ''
                    if not src or any(b in src.lower() for b in EXCLUDE_KEYWORDS):
                        continue
                    if 'wp-content/uploads' in src:
                        score = 0
                        if any(k in src.lower() for k in ['locandina', 'poster', 'flyer', 'manifesto', 'programma', 'coperta']):
                            score += 5
                        candidates.append((score, src))
                if candidates:
                    candidates.sort(key=lambda x: x[0], reverse=True)
                    best_url = candidates[0][1]
                    if check_image_reachable(best_url):
                        return best_url

            # 3. OPENGRAPH / TWITTER META IMAGE FALLBACK
            og = re.findall(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
            if not og:
                og = re.findall(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html, re.I)
            if og:
                og_url = og[0].strip()
                if not any(b in og_url.lower() for b in EXCLUDE_KEYWORDS) and check_image_reachable(og_url):
                    return og_url

    except Exception:
        pass
    return None

def process_festival(f_data):
    fid, name, source_url = f_data
    loc = extract_authentic_locandina(source_url, name)
    return fid, name, loc

def run_enrichment():
    db: Session = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        print(f"Enriching {len(festivals)} festivals with authentic locandine...")
        
        items = [(f.id, f.name, f.source_url) for f in festivals]
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(process_festival, items))

        results_map = {fid: loc for fid, name, loc in results}

        updated_locandine = 0
        cleaned_wiki = 0

        for f in festivals:
            loc = results_map.get(f.id)
            if loc:
                f.image_url = loc
                updated_locandine += 1
            else:
                # If current image_url is a generic Wikipedia photo or contains DSC (user photo), reset to None
                # so the frontend will cleanly display the authentic official locandina_placeholder.svg
                if f.image_url and ('wikimedia' in f.image_url or 'wikipedia' in f.image_url or 'DSC' in f.image_url):
                    f.image_url = None
                    cleaned_wiki += 1

        db.commit()
        print("\n" + "="*50)
        print(f"ENRICHMENT COMPLETED SUCCESSFULLY:")
        print(f"  - Authentic Locandine Assigned: {updated_locandine}")
        print(f"  - Generic Wikipedia Images Cleared: {cleaned_wiki}")
        print(f"  - Total Festivals in DB: {len(festivals)}")
        print("="*50)

    except Exception as e:
        db.rollback()
        print(f"Error during enrichment: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    run_enrichment()
