import unittest
import sys
import os

# Add scraper root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from umbria_festivals.items import FestivalItem
from umbria_festivals.spiders.proloco_spiders import is_invalid_image, is_flag_or_emblem, DISH_DESCRIPTIONS
from umbria_festivals.sources import SOURCES

class TestScraperModule(unittest.TestCase):
    def test_festival_item_fields(self):
        item = FestivalItem()
        fields = set(item.fields.keys())
        expected_fields = {
            "name", "city", "province", "latitude", "longitude",
            "start_date", "end_date", "source_url", "cultural_info",
            "dish_info", "image_url", "description", "menu_info", "program_info"
        }
        for field in expected_fields:
            self.assertIn(field, fields, f"Missing field {field} in FestivalItem")

    def test_image_validation(self):
        self.assertTrue(is_invalid_image("https://example.com/logo.png"))
        self.assertTrue(is_invalid_image("https://example.com/favicon.ico"))
        self.assertTrue(is_invalid_image("https://example.com/bandiera_umbria.svg"))
        self.assertFalse(is_invalid_image("https://example.com/photo_sagra.jpg"))

    def test_sources_configuration(self):
        self.assertTrue(len(SOURCES) >= 4)
        for src in SOURCES:
            self.assertIn("name", src)
            self.assertTrue("start_urls" in src or "url" in src)
            urls = src.get("start_urls") or [src.get("url")]
            self.assertTrue(len(urls) > 0)

    def test_date_formatting_preserves_archive_years(self):
        from umbria_festivals.spiders.proloco_spiders import ProlocoSpider
        spider = ProlocoSpider()
        self.assertEqual(spider.format_date("15/08/2024"), "2024-08-15")
        self.assertEqual(spider.format_date("22/07/2025"), "2025-07-22")
        self.assertEqual(spider.format_date("10/08/2026"), "2026-08-10")

    def test_determine_integration_same_event_overlap(self):
        from umbria_festivals.pipelines import determine_integration
        candidates = [
            (
                "id-1234",
                "Sagra della Patata Rossa",
                "Colfiorito",
                "PG",
                43.0167,
                12.9167,
                "2026-08-14",
                "2026-08-14",  # single-day fallback placeholder
                "https://example.com/patata-colfiorito",
                None,
                None,
                None,
                "Un fantastico evento enogastronomico per riscoprire le tradizioni.",  # generic placeholder
                "- Gnocchi al ragù",
                None
            )
        ]
        new_item = {
            "name": "Sagra della Patata Rossa di Colfiorito",
            "city": "Colfiorito",
            "province": "PG",
            "start_date": "2026-08-14",
            "end_date": "2026-08-23",  # real multi-day range
            "source_url": "https://other-source.it/patata-rossa",
            "description": "Edizione estiva della storica Sagra della Patata Rossa con stand coperti e musica dal vivo.",
            "menu_info": "- Patate fritte a sfoglia\n- Spezzatino di vitello",
            "cultural_info": "Altopiano carsico di Colfiorito"
        }
        action, target_id, data = determine_integration(candidates, new_item)
        self.assertEqual(action, "UPDATE")
        self.assertEqual(target_id, "id-1234")
        # Dates should be widened
        self.assertEqual(data["start_date"], "2026-08-14")
        self.assertEqual(data["end_date"], "2026-08-23")
        # Description should be enriched over generic placeholder
        self.assertIn("Edizione estiva", data["description"])
        # Menu should be merged
        self.assertIn("Gnocchi al ragù", data["menu_info"])
        self.assertIn("Patate fritte", data["menu_info"])

    def test_determine_integration_multi_year_archive_preservation(self):
        from umbria_festivals.pipelines import determine_integration
        candidates = [
            (
                "id-2025",
                "Sagra della Cipolla",
                "Cannara",
                "PG",
                42.9944,
                12.5833,
                "2025-09-02",
                "2025-09-12",
                "https://sagreumbre.it/sagra-cipolla.html",
                "Storia di Cannara",
                "Cipolla dorata",
                None,
                "Edizione 2025 della Sagra della Cipolla.",
                "- Penne alla cannarina",
                None
            )
        ]
        # Scraped item for season 2026
        new_item = {
            "name": "Sagra della Cipolla",
            "city": "Cannara",
            "province": "PG",
            "start_date": "2026-09-01",
            "end_date": "2026-09-11",
            "source_url": "https://sagreumbre.it/sagra-cipolla.html",  # website reuses same URL
            "description": "Edizione 2026 della Festa della Cipolla.",
            "menu_info": "- Risotto alla cipolla"
        }
        action, target_id, data = determine_integration(candidates, new_item)
        # MUST NOT OVERWRITE the 2025 record! Must INSERT as a distinct archive edition
        self.assertEqual(action, "INSERT")
        self.assertIsNone(target_id)
        self.assertEqual(data["start_date"], "2026-09-01")
        # Disambiguates reused URL with year hash so both years coexist in DB
        self.assertIn("#2026", data["source_url"])

    def test_determine_integration_different_cities_coexistence(self):
        from umbria_festivals.pipelines import determine_integration
        candidates = [
            (
                "id-costano",
                "Sagra della Porchetta",
                "Costano",
                "PG",
                43.0336,
                12.5647,
                "2026-08-20",
                "2026-08-30",
                "https://example.com/porchetta-costano",
                None, None, None, "Porchetta di Costano", None, None
            )
        ]
        # Festival with SAME name in a DIFFERENT town
        new_item = {
            "name": "Sagra della Porchetta",
            "city": "Bettona",
            "province": "PG",
            "start_date": "2026-08-22",
            "end_date": "2026-08-28",
            "source_url": "https://example.com/porchetta-bettona",
            "description": "Festa a Bettona"
        }
        action, target_id, data = determine_integration(candidates, new_item)
        # Must be treated as a separate distinct festival!
        self.assertEqual(action, "INSERT")
        self.assertIsNone(target_id)
        self.assertEqual(data["city"], "Bettona")

    def test_italian_text_date_extraction(self):
        from umbria_festivals.spiders.proloco_spiders import extract_dates_from_text
        # Range with single month
        s1, e1 = extract_dates_from_text("La festa si terrà dal 14 al 23 agosto 2026 tra le vie del borgo.", "Festa")
        self.assertEqual(s1, "2026-08-14")
        self.assertEqual(e1, "2026-08-23")

        # Range spanning two months
        s2, e2 = extract_dates_from_text("Appuntamento dal 28 luglio al 4 agosto 2025 con degustazioni.", "Sagra 2025")
        self.assertEqual(s2, "2025-07-28")
        self.assertEqual(e2, "2025-08-04")

        # Single date with month name
        s3, e3 = extract_dates_from_text("Grande serata il 15 agosto 2026 con fuochi d'artificio.", "Notte di Ferragosto")
        self.assertEqual(s3, "2026-08-15")
        self.assertEqual(e3, "2026-08-15")

    def test_extract_city_safeguards(self):
        from umbria_festivals.spiders.proloco_spiders import ProlocoSpider
        spider = ProlocoSpider()
        # Must NOT extract "Sagra Del Tartufo" as city!
        city1 = spider.extract_city("Sagra del Tartufo 2026", "https://example.com/sagra", "la sagra si svolge a norcia")
        self.assertEqual(city1, "Norcia")

        # Known town in title takes precedence
        city2 = spider.extract_city("Sagra della Patata Rossa a Colfiorito", "https://example.com/patata", "")
        self.assertEqual(city2, "Colfiorito")

    def test_determine_integration_corrects_generic_city_and_name(self):
        from umbria_festivals.pipelines import determine_integration
        candidates = [
            (
                "id-placeholder",
                "Sagra Sconosciuta",
                "Umbria",
                "PG",
                43.1107,
                12.3908,
                "2026-08-10",
                "2026-08-10",
                "https://example.com/patata-rossa",
                None, None, None, None, None, None
            )
        ]
        new_item = {
            "name": "Sagra della Patata Rossa",
            "city": "Colfiorito",
            "province": "PG",
            "start_date": "2026-08-10",
            "end_date": "2026-08-18",
            "source_url": "https://example.com/patata-rossa",
            "description": "Autentica sagra a Colfiorito"
        }
        action, target_id, data = determine_integration(candidates, new_item)
        self.assertEqual(action, "UPDATE")
        self.assertEqual(target_id, "id-placeholder")
        # City and name must be corrected from generic placeholders
        self.assertEqual(data["city"], "Colfiorito")
        self.assertEqual(data["name"], "Sagra della Patata Rossa")
        self.assertEqual(data["start_date"], "2026-08-10")
        self.assertEqual(data["end_date"], "2026-08-18")

    def test_determine_integration_url_fragment_edition_update(self):
        from umbria_festivals.pipelines import determine_integration
        # Candidate was stored with #2026 disambiguation
        candidates = [
            (
                "id-2026",
                "Sagra della Cipolla",
                "Cannara",
                "PG",
                42.9944,
                12.5833,
                "2026-09-01",
                "2026-09-10",
                "https://example.com/sagra-cipolla#2026",
                None, None, None, "Edizione 2026", None, None
            )
        ]
        # Re-scraping the same page providing base URL
        new_item = {
            "name": "Sagra della Cipolla",
            "city": "Cannara",
            "province": "PG",
            "start_date": "2026-09-01",
            "end_date": "2026-09-12",
            "source_url": "https://example.com/sagra-cipolla",
            "description": "Edizione 2026 arricchita"
        }
        action, target_id, data = determine_integration(candidates, new_item)
        # Must UPDATE existing #2026 record rather than crashing on duplicate key
        self.assertEqual(action, "UPDATE")
        self.assertEqual(target_id, "id-2026")
        self.assertEqual(data["end_date"], "2026-09-12")

if __name__ == "__main__":
    unittest.main()
