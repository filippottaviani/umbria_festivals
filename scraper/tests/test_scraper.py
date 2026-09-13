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

if __name__ == "__main__":
    unittest.main()
