import re
import logging
from datetime import date, datetime
from typing import Optional, Tuple
import httpx
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

MONTH_MAP = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
    'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
    'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12,
    'gen': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mag': 5, 'giu': 6,
    'lug': 7, 'ago': 8, 'set': 9, 'ott': 10, 'nov': 11, 'dic': 12
}

def parse_dates_from_text(text: str, default_year: int = 2026) -> Optional[Tuple[date, date]]:
    """Estrattore strutturato per date italiane in testi di sagre (es. 'dal 14 al 23 agosto 2026')."""
    if not text:
        return None

    clean_text = text.lower().strip()

    # Pattern 1: dal DD1 al DD2 mese YYYY (es. dal 14 al 23 agosto 2026)
    m1 = re.search(r'dal?\s+(\d{1,2})\s+al?\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})?', clean_text)
    if m1:
        d1 = int(m1.group(1))
        d2 = int(m1.group(2))
        m_str = m1.group(3)
        y = int(m1.group(4)) if m1.group(4) else default_year
        if m_str in MONTH_MAP:
            month = MONTH_MAP[m_str]
            try:
                start_d = date(y, month, d1)
                end_d = date(y, month, d2)
                return (start_d, end_d)
            except ValueError:
                pass

    # Pattern 2: DD1-DD2 Mese YYYY (es. 14-23 Agosto 2026)
    m2 = re.search(r'(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})?', clean_text)
    if m2:
        d1 = int(m2.group(1))
        d2 = int(m2.group(2))
        m_str = m2.group(3)
        y = int(m2.group(4)) if m2.group(4) else default_year
        if m_str in MONTH_MAP:
            month = MONTH_MAP[m_str]
            try:
                start_d = date(y, month, d1)
                end_d = date(y, month, d2)
                return (start_d, end_d)
            except ValueError:
                pass

    # Pattern 3: DD1/MM1/YYYY - DD2/MM2/YYYY (es. 14/08/2026 - 23/08/2026)
    m3 = re.search(r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*[-–\s]+(\d{1,2})[/.-](\d{4})', clean_text)
    if m3:
        try:
            d1, m1_num, y1, d2, m2_num, y2 = int(m3.group(1)), int(m3.group(2)), int(m3.group(3)), int(m3.group(4)), int(m3.group(5)), int(m3.group(6))
            return (date(y1, m1_num, d1), date(y2, m2_num, d2))
        except (ValueError, IndexError):
            pass

    return None


def fetch_source_dates(source_url: str) -> Optional[Tuple[date, date]]:
    """Esegue lo scraping/parsing strutturato della pagina di origine per estrarre le date ufficiali pubblicate."""
    if not source_url or not source_url.startswith("http"):
        return None

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SagraUmbraDateVerifier/2.0"}
    try:
        with httpx.Client(timeout=8.0, follow_redirects=True, headers=headers) as client:
            resp = client.get(source_url)
            if resp.status_code != 200:
                return None

            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Look for structured JSON-LD Event schema
            for script in soup.find_all('script', type='application/ld+json'):
                try:
                    import json
                    ld_data = json.loads(script.string or '{}')
                    if isinstance(ld_data, dict) and ld_data.get('@type') in ['Event', 'Festival', 'FoodEvent']:
                        s_str = ld_data.get('startDate')
                        e_str = ld_data.get('endDate')
                        if s_str and e_str:
                            start_d = date.fromisoformat(s_str.split('T')[0])
                            end_d = date.fromisoformat(e_str.split('T')[0])
                            return (start_d, end_d)
                except Exception:
                    pass

            # Search in page title or h1/h2 tags
            text_snippet = " ".join([t.get_text() for t in soup.find_all(['h1', 'h2', 'h3', 'p', 'time', 'span'])])
            parsed = parse_dates_from_text(text_snippet)
            if parsed:
                return parsed

    except Exception as e:
        logging.warning(f"Impossible verificare le date da {source_url}: {e}")

    return None
