import urllib.request
import re
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

def get_organic_texts(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req, timeout=8).read().decode('utf-8')
        soup = BeautifulSoup(html, "html.parser")
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "aside"]):
            script.extract()
            
        # Get all paragraphs
        paragraphs = soup.find_all(['p', 'div'])
        
        valid_paragraphs = []
        for p in paragraphs:
            # get_text with separator handles inline tags like <strong> without breaking sentences
            text = p.get_text(separator=' ', strip=True)
            # Remove excessive whitespace
            text = re.sub(r'\s+', ' ', text)
            
            # Filter criteria
            if len(text) < 40: continue
            if "cookie" in text.lower() or "privacy" in text.lower(): continue
            if "javascript" in text.lower() or "browser" in text.lower(): continue
            if text.startswith(','): continue # Skip broken remnants just in case
            if "acconsenti all" in text.lower(): continue
            if "diritti riservati" in text.lower(): continue
            
            # Only add if it's not mostly duplicate of previous
            if not valid_paragraphs or text not in valid_paragraphs[-1]:
                # Many sites use divs for layout. If it has too many words, it's probably content.
                valid_paragraphs.append(text)
                
        # Deduplicate while preserving order
        seen = set()
        unique_paragraphs = []
        for text in valid_paragraphs:
            if text not in seen:
                seen.add(text)
                unique_paragraphs.append(text)
                
        if not unique_paragraphs:
            return None, None

        # Build description (first 2-3 paragraphs)
        desc_paragraphs = []
        for p in unique_paragraphs:
            # Skip things that look like menus for the description if possible
            if not any(k in p.lower() for k in ["menù", "menu", "piatti", "stand gastronomico"]):
                desc_paragraphs.append(p)
            if len(desc_paragraphs) >= 3:
                break
                
        # If we filtered everything out, just take the first few
        if not desc_paragraphs:
            desc_paragraphs = unique_paragraphs[:2]
            
        description = "\n\n".join(desc_paragraphs)

        # Build menu
        menu_items = []
        for p in unique_paragraphs:
            if any(k in p.lower() for k in ["menù", "menu", "piatti", "degustazione", "stand", "specialità", "ristorante", "cucina", "gastronomia", "arrosticini", "gnocchi", "tartufo", "torta al testo", "frittell", "tagliatelle", "pasta"]):
                if p not in desc_paragraphs:  # Avoid duplicating the description
                    menu_items.append(p)
                    
        menu_info = "\n\n".join(menu_items) if menu_items else ""

        return description, menu_info

    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None, None

def main():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        updated = 0
        
        for f in festivals:
            source = f.source_url
            if not source:
                continue
                
            print(f"Processing {f.name}...")
            desc, menu = get_organic_texts(source)
            
            needs_update = False
            
            if desc and len(desc) > 50:
                f.description = desc
                needs_update = True
                
            if menu is not None:
                # If we found an organic menu, use it. If it's empty, we overwrite the generic fallback with empty string, 
                # so the frontend will trigger the nice "Menu non disponibile" UI we just built.
                f.menu_info = menu
                needs_update = True
                
            if needs_update:
                updated += 1
                print(f" -> Updated organic text for {f.name}")
                
        db.commit()
        print(f"Successfully updated {updated} festivals with organic text.")
    finally:
        db.close()

if __name__ == '__main__':
    main()
