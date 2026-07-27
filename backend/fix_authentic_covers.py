import urllib.request
import re
import json
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

def get_og_image(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        html = urllib.request.urlopen(req, timeout=5).read().decode('utf-8')
        soup = BeautifulSoup(html, "html.parser")
        meta = soup.find("meta", property="og:image")
        if meta and meta.get("content"):
            return meta["content"]
        # Fallback to first large image
        img = soup.find("img", class_="attachment-post-thumbnail")
        if img and img.get("src"):
            return img["src"]
        return None
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def check_url_exists(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}, method='HEAD')
        resp = urllib.request.urlopen(req, timeout=5)
        return resp.status == 200
    except:
        return False

def main():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        updated = 0
        for f in festivals:
            source = f.source_url
            if not source:
                continue
                
            print(f"Checking {f.name}...")
            og_image = get_og_image(source)
            if og_image:
                if og_image.startswith("/"):
                    from urllib.parse import urlparse
                    parsed = urlparse(source)
                    og_image = f"{parsed.scheme}://{parsed.netloc}{og_image}"
                
                print(f" Found og:image: {og_image}")
                if check_url_exists(og_image):
                    print(f" -> URL is valid. Updating DB.")
                    f.image_url = og_image
                    updated += 1
                else:
                    print(f" -> URL is invalid (404/403).")
            else:
                print(" -> No og:image found.")
                
        db.commit()
        print(f"Successfully updated {updated} authentic covers from source_urls.")
    finally:
        db.close()

if __name__ == '__main__':
    main()
