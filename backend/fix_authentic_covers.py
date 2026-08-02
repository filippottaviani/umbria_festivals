import os
import re
import json
import urllib.request
import urllib.parse

if not os.getenv("DATABASE_URL"):
    env_path = os.path.join(os.path.dirname(__file__), ".env")
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


INVALID_KEYWORDS = [
    "flag", "bandiera", "stemma", "coat_of_arms", "emblem", "gonfalone",
    ".svg", "favicon", "avatar", "gravatar", "facebook", "instagram",
    "whatsapp", "share", "button", "badge", "px.gif", "1x1", "logo"
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
}

def is_invalid_image(url_str: str) -> bool:
    if not url_str:
        return True
    u = url_str.lower()
    return any(k in u for k in INVALID_KEYWORDS)

def check_image_reachable(url: str, timeout: int = 5) -> bool:
    try:
        req = urllib.request.Request(url, headers=HEADERS, method='HEAD')
        resp = urllib.request.urlopen(req, timeout=timeout)
        content_type = resp.headers.get('Content-Type', '')
        return resp.status == 200 and ('image' in content_type or not content_type)
    except Exception:
        try:
            req = urllib.request.Request(url, headers=HEADERS, method='GET')
            resp = urllib.request.urlopen(req, timeout=timeout)
            return resp.status == 200
        except Exception:
            return False

def extract_cover_from_source(source_url: str) -> str:
    """Extract authentic poster/image from source page using regex HTML parsing."""
    if not source_url:
        return None
    try:
        req = urllib.request.Request(source_url, headers=HEADERS)
        html_bytes = urllib.request.urlopen(req, timeout=6).read()
        html = html_bytes.decode('utf-8', errors='ignore')

        candidates = []

        # 1. OpenGraph & Twitter meta tags
        meta_matches = re.findall(r'<meta\s+[^>]*?(?:property|name)=["\'](?:og:image|twitter:image|og:image:secure_url)["\']\s+[^>]*?content=["\'](.*?)["\']', html, re.I)
        meta_matches += re.findall(r'<meta\s+[^>]*?content=["\'](.*?)["\']\s+[^>]*?(?:property|name)=["\'](?:og:image|twitter:image|og:image:secure_url)["\']', html, re.I)
        candidates.extend(meta_matches)

        # 2. Locandina/poster images, wp-content uploads, article img tags
        img_matches = re.findall(r'<img\s+[^>]*?src=["\'](.*?)["\']', html, re.I)
        for img in img_matches:
            if any(k in img.lower() for k in ['upload', 'sagra', 'locandina', 'poster', 'flyer', 'festa', 'evento']):
                candidates.append(img)

        # 3. CSS background-images
        bg_matches = re.findall(r'background-image\s*:\s*url\((.*?)\)', html, re.I)
        for bg in bg_matches:
            candidates.append(bg.strip("'\""))

        # Fallback: all remaining images
        candidates.extend(img_matches)

        for cand in candidates:
            cand = cand.strip()
            if not cand or cand.startswith('data:'):
                continue
            abs_url = urllib.parse.urljoin(source_url, cand)
            if not is_invalid_image(abs_url) and any(ext in abs_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                if check_image_reachable(abs_url):
                    return abs_url

    except Exception as e:
        print(f"Error scraping {source_url}: {e}")
    return None

def fetch_wikipedia_cover(query: str) -> str:
    """Fetch high-res Wikipedia/Wikimedia image for town or festival."""
    url = f"https://it.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=1280&redirects=1&titles={urllib.parse.quote(query)}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=5)
        data = json.loads(resp.read().decode('utf-8'))
        pages = data.get("query", {}).get("pages", {})
        for page_id, page_info in pages.items():
            if page_id != "-1" and "thumbnail" in page_info:
                source = page_info["thumbnail"].get("source")
                if source and not is_invalid_image(source):
                    return source
    except Exception:
        pass
    return None

def fix_all_covers():
    db: Session = SessionLocal()
    updated_count = 0
    details = []

    try:
        festivals = db.query(FestivalModel).all()
        for f in festivals:
            current_cover = f.image_url
            source_url = f.source_url
            
            # If current cover is valid and reachable, skip
            if current_cover and not is_invalid_image(current_cover) and check_image_reachable(current_cover):
                continue

            print(f"Scraping/enriching cover for '{f.name}' ({f.city})...")
            new_cover = extract_cover_from_source(source_url)
            
            if not new_cover:
                new_cover = fetch_wikipedia_cover(f"Sagra {f.name} {f.city}") or fetch_wikipedia_cover(f.city)

            if new_cover and new_cover != f.image_url:
                f.image_url = new_cover
                updated_count += 1
                details.append({"name": f.name, "city": f.city, "new_cover": new_cover})
                print(f"  -> Found cover: {new_cover}")

        db.commit()
        print(f"Done! Updated {updated_count} festival cover images.")
    except Exception as e:
        db.rollback()
        print(f"Error updating covers: {e}")
    finally:
        db.close()
        
    return updated_count, details

if __name__ == '__main__':
    fix_all_covers()
