import os
import re
import uuid
import logging
from datetime import datetime, date
from typing import Optional, Tuple, List, Dict, Any
import psycopg2
from itemadapter import ItemAdapter

from umbria_festivals.spiders.proloco_spiders import (
    TOWN_COORDINATES,
    get_real_province
)

GENERIC_PLACEHOLDERS = [
    "un fantastico evento enogastronomico",
    "i cuochi ed i volontari di",
    "affascinante borgo dell'umbria immerso nelle colline",
    "numerosi gli appuntamenti in programma",
    "appuntamento simbolo del calendario estivo",
    "manifestazione ricca di fascino e tradizione",
    "momento di ritrovo festoso per celebrare",
    "unisce generazioni di paesani",
    "tempo sembra scorrere a una velocit",
    "tempo sembra essersi fermato",
    "incantevole borgo dell'umbria",
    "vuoi promuovere la tua sagra o evento",
    "diritti riservati",
    "part. iva",
    "tutti i diritti riservati"
]

def is_generic_or_empty(text: Optional[str]) -> bool:
    if not text:
        return True
    t = text.strip().lower()
    if len(t) < 40:
        return True
    return any(p in t for p in GENERIC_PLACEHOLDERS)

def parse_date_safe(val: Any) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        return datetime.fromisoformat(val_str[:10]).date()
    except Exception:
        pass
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(val_str, fmt).date()
        except Exception:
            continue
    return None

def is_same_edition_overlap(new_start: date, new_end: date, cand_start: date, cand_end: date) -> bool:
    """
    Determines if two records represent the exact same festival edition/season:
    1. Same calendar year (or cross-year event within 30 days).
    2. Dates overlap (max(start) <= min(end)) OR start dates are within 21 days (same month/season edition).
    """
    if abs(new_start.year - cand_start.year) > 1:
        return False
    if new_start.year != cand_start.year and abs((new_start - cand_start).days) > 30:
        return False

    # Direct date range overlap
    if max(new_start, cand_start) <= min(new_end, cand_end):
        return True

    # Same season start date proximity (within 3 weeks)
    if abs((new_start - cand_start).days) <= 21:
        return True

    return False

def _has_menu_content(text: Optional[str]) -> bool:
    """A menu has content if it has at least one non-empty, non-junk line."""
    if not text:
        return False
    junk = ["diritti riservati", "part. iva", "copyright", "tutti i diritti"]
    for line in text.split("\n"):
        line_clean = line.strip().lower().strip("-*\u2022 ")
        if line_clean and len(line_clean) >= 3 and not any(j in line_clean for j in junk):
            return True
    return False

def merge_menu_text(old_menu: Optional[str], new_menu: Optional[str]) -> Optional[str]:
    old_has = _has_menu_content(old_menu)
    new_has = _has_menu_content(new_menu)

    if not old_has and not new_has:
        return old_menu
    if not old_has:
        return new_menu
    if not new_has:
        return old_menu

    old_lines = [l.strip() for l in (old_menu or "").split("\n") if l.strip()]
    new_lines = [l.strip() for l in (new_menu or "").split("\n") if l.strip()]

    seen = set()
    combined = []
    for line in old_lines + new_lines:
        line_clean = line.lower().strip("-*• ")
        if line_clean not in seen and not any(junk in line_clean for junk in ["diritti riservati", "part. iva", "copyright"]):
            seen.add(line_clean)
            combined.append(line)

    return "\n\n".join(combined[:25]) if combined else old_menu

def determine_integration(candidates: List[tuple], new_item: Dict[str, Any]) -> Tuple[str, Optional[str], Dict[str, Any]]:
    """
    Given candidates matching by source_url or (city, name) and the incoming scraped item:
    - If a candidate represents the SAME festival edition: return ("UPDATE", candidate_id, merged_data)
    - If no candidate overlaps (new festival OR distinct year/edition for archive): return ("INSERT", None, insert_data)
    """
    name = (new_item.get("name") or "").strip()
    city = (new_item.get("city") or "").strip()
    province = get_real_province(city)
    source_url = (new_item.get("source_url") or "").strip()

    new_start = parse_date_safe(new_item.get("start_date"))
    new_end = parse_date_safe(new_item.get("end_date")) or new_start

    if not new_start or not new_end:
        return ("SKIP", None, {})

def clean_festival_name(n: str) -> str:
    cleaned = re.sub(r'^(?:sagra|festa|fiera|palio|mostra(?:\s+mercato)?)\s+(?:de(?:l(?:l[a-z])?|i|gli)?|d[\'’]|a(?:l(?:l[a-z])?|i)?|in\s+onore\s+di|di)?\s*', '', (n or '').lower(), flags=re.IGNORECASE).strip()
    return cleaned if len(cleaned) >= 3 else (n or '').lower().strip()

def determine_integration(candidates: List[tuple], new_item: Dict[str, Any]) -> Tuple[str, Optional[str], Dict[str, Any]]:
    """
    Given candidates matching by source_url or (city, name) and the incoming scraped item:
    - If a candidate represents the SAME festival edition: return ("UPDATE", candidate_id, merged_data)
    - If no candidate overlaps (new festival OR distinct year/edition for archive): return ("INSERT", None, insert_data)
    """
    name = (new_item.get("name") or "").strip()
    city = (new_item.get("city") or "").strip()
    source_url = (new_item.get("source_url") or "").strip()
    source_base = source_url.split('#')[0].strip()

    new_start = parse_date_safe(new_item.get("start_date"))
    new_end = parse_date_safe(new_item.get("end_date")) or new_start

    if not new_start or not new_end:
        return ("SKIP", None, {})

    if new_start > new_end:
        new_start, new_end = new_end, new_start

    clean_name = clean_festival_name(name)
    matching_candidate = None

    for cand in candidates:
        cand_id, cand_name, cand_city, cand_prov, cand_lat, cand_lon, c_start_raw, c_end_raw, cand_url, cand_cult, cand_dish, cand_img, cand_desc, cand_menu, cand_prog = cand
        cand_start = parse_date_safe(c_start_raw)
        cand_end = parse_date_safe(c_end_raw) or cand_start

        if not cand_start or not cand_end:
            continue

        if cand_start > cand_end:
            cand_start, cand_end = cand_end, cand_start

        cand_base = cand_url.split('#')[0].strip() if cand_url else ""

        # Check 1: Base URL match (same site and slug)
        if cand_base and source_base and cand_base == source_base:
            # If dates are in the same year or within 60 days, it is the same edition
            if cand_start.year == new_start.year or abs((new_start - cand_start).days) <= 60:
                matching_candidate = cand
                break
            else:
                # Same URL reused across different years (multi-year archive)
                continue

        # Check 2: Same city AND matching name
        cand_city_clean = (cand_city or "").strip().lower()
        if cand_city_clean == city.lower() or city.lower() in cand_city_clean or cand_city_clean in city.lower():
            cand_name_clean = clean_festival_name(cand_name)
            name_match = (
                clean_name == cand_name_clean
                or (len(clean_name) >= 4 and clean_name in (cand_name or "").lower())
                or (len(cand_name_clean) >= 4 and cand_name_clean in name.lower())
            )
            if name_match:
                if is_same_edition_overlap(new_start, new_end, cand_start, cand_end):
                    matching_candidate = cand
                    break

    # If overlapping festival found -> UPDATE and integrate
    if matching_candidate:
        cand_id, cand_name, cand_city, cand_prov, cand_lat, cand_lon, c_start_raw, c_end_raw, cand_url, cand_cult, cand_dish, cand_img, cand_desc, cand_menu, cand_prog = matching_candidate
        cand_start = parse_date_safe(c_start_raw)
        cand_end = parse_date_safe(c_end_raw) or cand_start
        if cand_start and cand_end and cand_start > cand_end:
            cand_start, cand_end = cand_end, cand_start

        # Date integration: widen or correct single-day placeholders
        if cand_start == cand_end and new_start != new_end:
            int_start = new_start
            int_end = new_end
        elif new_start and cand_start and new_start.year == cand_start.year:
            int_start = min(cand_start, new_start)
            int_end = max(cand_end, new_end)
        else:
            int_start = cand_start or new_start
            int_end = cand_end or new_end

        if int_start > int_end:
            int_start, int_end = int_end, int_start

        # Name correction: prefer authentic name over generic crawler placeholder
        cand_name_str = (cand_name or "").strip()
        new_name_str = name.strip()
        int_name = cand_name_str
        if (not cand_name_str or cand_name_str.lower() in ["sagra sconosciuta", "sagra!", "stasera sagra!!", "stasera… sagra!!"] or len(cand_name_str) < 5) and len(new_name_str) >= 5:
            int_name = new_name_str
        elif len(new_name_str) > len(cand_name_str) and not any(j in new_name_str.lower() for j in ["stasera", "sconosciuta"]):
            if cand_name_str.lower() in new_name_str.lower():
                int_name = new_name_str

        # City correction: if candidate had "Umbria" or generic city, but new item has real town
        cand_city_str = (cand_city or "").strip()
        new_city_str = city.strip()
        int_city = cand_city_str
        if (not cand_city_str or cand_city_str.lower() in ["umbria", ""]) and new_city_str and new_city_str.lower() not in ["umbria", ""]:
            int_city = new_city_str

        int_prov = get_real_province(int_city)

        # Text fields integration
        new_desc = new_item.get("description")
        if is_generic_or_empty(cand_desc) and not is_generic_or_empty(new_desc):
            int_desc = new_desc
        elif not is_generic_or_empty(new_desc) and len((new_desc or "").strip()) > len((cand_desc or "").strip()) + 40:
            int_desc = new_desc
        else:
            int_desc = cand_desc or new_desc

        new_cult = new_item.get("cultural_info")
        int_cult = new_cult if (is_generic_or_empty(cand_cult) and not is_generic_or_empty(new_cult)) else (cand_cult or new_cult)

        new_dish = new_item.get("dish_info")
        int_dish = new_dish if (is_generic_or_empty(cand_dish) and not is_generic_or_empty(new_dish)) else (cand_dish or new_dish)

        int_menu = merge_menu_text(cand_menu, new_item.get("menu_info"))
        int_prog = cand_prog or new_item.get("program_info")

        # Image integration: prefer real locandina/poster over city fallback
        new_img = new_item.get("image_url")
        int_img = cand_img
        if not cand_img or not cand_img.strip():
            int_img = new_img
        elif new_img and any(k in new_img.lower() for k in ["locandina", "poster", "sagra", "uploads"]) and not any(k in (cand_img or "").lower() for k in ["locandina", "poster", "uploads"]):
            int_img = new_img
        elif "wikimedia.org" in (cand_img or "").lower() and new_img and "wikimedia.org" not in new_img.lower():
            int_img = new_img

        # Coordinates & Province validation
        int_lat = cand_lat
        int_lon = cand_lon
        dict_key = int_city.title()
        if (int_lat is None or (int_lat == 43.1107 and int_lon == 12.3908 and int_city.lower() != "perugia")):
            if new_item.get("latitude") and (new_item.get("latitude") != 43.1107 or int_city.lower() == "perugia"):
                int_lat = new_item.get("latitude")
                int_lon = new_item.get("longitude")
            elif dict_key in TOWN_COORDINATES:
                int_lat, int_lon = TOWN_COORDINATES[dict_key]
            elif int_city in TOWN_COORDINATES:
                int_lat, int_lon = TOWN_COORDINATES[int_city]

        merged_data = {
            "name": int_name,
            "city": int_city,
            "province": int_prov,
            "latitude": int_lat or 43.1107,
            "longitude": int_lon or 12.3908,
            "start_date": int_start.isoformat(),
            "end_date": int_end.isoformat(),
            "cultural_info": int_cult,
            "dish_info": int_dish,
            "image_url": int_img,
            "description": int_desc,
            "menu_info": int_menu,
            "program_info": int_prog
        }
        return ("UPDATE", str(cand_id), merged_data)

    # NO overlap found: INSERT as a new distinct record in the archive
    lat = new_item.get("latitude")
    lon = new_item.get("longitude")
    dict_key = city.title()
    if (lat is None or (lat == 43.1107 and lon == 12.3908 and city.lower() != "perugia")):
        if dict_key in TOWN_COORDINATES:
            lat, lon = TOWN_COORDINATES[dict_key]
        elif city in TOWN_COORDINATES:
            lat, lon = TOWN_COORDINATES[city]
        else:
            lat = lat or 43.1107
            lon = lon or 12.3908

    # Safe source_url disambiguation for multi-year archive
    final_source_url = source_url
    if any(c[8] == source_url for c in candidates):
        final_source_url = f"{source_base}#{new_start.year}"

    # If final_source_url already exists among candidates, it's an existing edition: UPDATE instead of crashing
    for c in candidates:
        if c[8] == final_source_url:
            return determine_integration([c], new_item)

    insert_data = {
        "id": str(uuid.uuid4()),
        "name": name,
        "city": city,
        "province": get_real_province(city),
        "latitude": lat,
        "longitude": lon,
        "start_date": new_start.isoformat(),
        "end_date": new_end.isoformat(),
        "source_url": final_source_url,
        "cultural_info": new_item.get("cultural_info"),
        "dish_info": new_item.get("dish_info"),
        "image_url": new_item.get("image_url"),
        "description": new_item.get("description"),
        "menu_info": new_item.get("menu_info"),
        "program_info": new_item.get("program_info")
    }
    return ("INSERT", None, insert_data)


class PostgreSQLPipeline:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.connection = None
        self.cursor = None

    @classmethod
    def from_crawler(cls, crawler):
        db_url = crawler.settings.get("DATABASE_URL") or os.getenv("DATABASE_URL")
        if not db_url:
            user = os.getenv("POSTGRES_USER", "postgres")
            password = os.getenv("POSTGRES_PASSWORD", "postgres")
            db = os.getenv("POSTGRES_DB", "postgres")
            host = os.getenv("POSTGRES_HOST", "db")
            port = os.getenv("POSTGRES_PORT", "5432")
            db_url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
        return cls(db_url=db_url)

    def open_spider(self, spider):
        try:
            self.connection = psycopg2.connect(self.db_url)
            self.cursor = self.connection.cursor()
            if self.cursor:
                self.cursor.execute("""
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS cultural_info TEXT;
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS dish_info TEXT;
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS image_url VARCHAR;
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS description TEXT;
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS menu_info TEXT;
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS program_info TEXT;
                """)
                self.connection.commit()
        except Exception as e:
            logging.error("PostgreSQL connection or table migration failed: %s", e)
            self.connection = None
            self.cursor = None

    def close_spider(self, spider):
        if self.connection:
            try:
                self.connection.commit()
            except Exception:
                pass
            try:
                if self.cursor:
                    self.cursor.close()
            except Exception:
                pass
            try:
                self.connection.close()
            except Exception:
                pass

    def _fetch_candidates(self, source_url: str, name: str, city: str) -> List[tuple]:
        if not self.cursor:
            return []
        try:
            clean_name = clean_festival_name(name)
            name_pattern = f"%{clean_name[:12]}%" if len(clean_name) >= 4 else f"%{name.strip()}%"
            base_url = source_url.split('#')[0].strip()

            self.cursor.execute(
                """
                SELECT id, name, city, province, latitude, longitude, start_date, end_date,
                       source_url, cultural_info, dish_info, image_url, description, menu_info, program_info
                FROM festivals
                WHERE source_url = %s
                   OR source_url LIKE %s
                   OR (LOWER(city) = LOWER(%s) AND (LOWER(name) = LOWER(%s) OR name ILIKE %s))
                """,
                (source_url, f"{base_url}#%", city, name, name_pattern)
            )
            return self.cursor.fetchall()
        except Exception as e:
            logging.warning("Error fetching candidates for (%s, %s): %s", name, city, e)
            if self.connection:
                self.connection.rollback()
            return []

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        name = (adapter.get("name") or "").strip()
        city = (adapter.get("city") or "").strip()
        start_date = adapter.get("start_date")
        end_date = adapter.get("end_date")
        source_url = (adapter.get("source_url") or "").strip()

        if not name or not city or not start_date or not end_date or not source_url:
            logging.debug("Skipping incomplete festival item: %s", adapter.asdict())
            return item

        if not self.cursor:
            logging.warning("No DB cursor available, skipping item processing")
            return item

        try:
            candidates = self._fetch_candidates(source_url, name, city)
            action, target_id, data = determine_integration(candidates, adapter.asdict())

            if action == "UPDATE" and target_id:
                update_query = """
                    UPDATE festivals
                    SET name = %s,
                        city = %s,
                        province = %s,
                        latitude = %s,
                        longitude = %s,
                        start_date = %s,
                        end_date = %s,
                        cultural_info = %s,
                        dish_info = %s,
                        image_url = %s,
                        description = %s,
                        menu_info = %s,
                        program_info = %s
                    WHERE id = %s
                """
                self.cursor.execute(
                    update_query,
                    (
                        data["name"],
                        data["city"],
                        data["province"],
                        data["latitude"],
                        data["longitude"],
                        data["start_date"],
                        data["end_date"],
                        data["cultural_info"],
                        data["dish_info"],
                        data["image_url"],
                        data["description"],
                        data["menu_info"],
                        data["program_info"],
                        target_id
                    )
                )
                self.connection.commit()
                logging.info("[INTEGRATED OVERLAP] Enriched existing festival: %s (%s) [%s to %s]", name, city, data["start_date"], data["end_date"])

            elif action == "INSERT":
                insert_query = """
                    INSERT INTO festivals (id, name, city, province, latitude, longitude, start_date, end_date, source_url, cultural_info, dish_info, image_url, description, menu_info, program_info)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                self.cursor.execute(
                    insert_query,
                    (
                        data["id"],
                        data["name"],
                        data["city"],
                        data["province"],
                        data["latitude"],
                        data["longitude"],
                        data["start_date"],
                        data["end_date"],
                        data["source_url"],
                        data["cultural_info"],
                        data["dish_info"],
                        data["image_url"],
                        data["description"],
                        data["menu_info"],
                        data["program_info"]
                    )
                )
                self.connection.commit()
                logging.info("[ARCHIVE INSERT] Inserted new festival record: %s (%s) [%s to %s]", name, city, data["start_date"], data["end_date"])

        except Exception as exc:
            if self.connection:
                self.connection.rollback()
            logging.warning("Failed to process festival item %s: %s", adapter.asdict(), exc)

        return item