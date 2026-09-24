"""
Unit and integration tests for AIFestivalAgent (Text, PNG, and PDF extraction).
"""

import unittest
import os
import io
from PIL import Image, ImageDraw
import pypdf

from umbria_festivals.ai_agent import AIFestivalAgent, FestivalItemSchema
from umbria_festivals.document_processor import extract_pdf_content, load_image


class TestAIFestivalAgent(unittest.TestCase):

    def setUp(self):
        self.agent = AIFestivalAgent()

    def test_text_extraction(self):
        sample_text = """
        <h1>Sagra del Cinghiale di Narni 2026</h1>
        <p>Dal 15 agosto al 25 agosto 2026 vi aspettiamo a Narni per la grande festa popolare.</p>
        <h2>Menù tipico</h2>
        <ul>
            <li>Pappardelle al ragù di cinghiale selvatico</li>
            <li>Spezzatino in umido con polenta</li>
            <li>Torta al testo con prosciutto e pecorino</li>
        </ul>
        """
        item = self.agent.extract_from_text(sample_text, source_url="https://example.com/narni")

        self.assertIsInstance(item, FestivalItemSchema)
        self.assertIn("Narni", item.city)
        self.assertEqual(item.province, "TR")
        self.assertEqual(item.start_date, "2026-08-15")
        self.assertEqual(item.end_date, "2026-08-25")
        self.assertIsNotNone(item.menu_info)
        self.assertEqual(item.latitude, 42.5181)
        self.assertEqual(item.longitude, 12.5153)

    def test_png_image_extraction(self):
        # Create a synthetic PNG image poster
        img = Image.new('RGB', (400, 300), color=(255, 255, 255))
        d = ImageDraw.Draw(img)
        d.text((20, 20), "SAGRA DELLA CIPOLLE CANNARA 2026", fill=(0, 0, 0))
        d.text((20, 60), "Dal 2 al 10 Settembre a Cannara (PG)", fill=(0, 0, 0))
        d.text((20, 100), "Specialita: Zuppa di cipolle e penne alla cannarina", fill=(0, 0, 0))

        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_bytes = img_byte_arr.getvalue()

        # Extract using AI Agent
        item = self.agent.extract_from_image(img_bytes, source_url="https://example.com/cannara.png")

        self.assertIsInstance(item, FestivalItemSchema)
        self.assertIsNotNone(item.name)
        self.assertIsNotNone(item.city)
        self.assertIn(item.province, ["PG", "TR"])

    def test_pdf_extraction(self):
        # Create a synthetic PDF file in memory
        writer = pypdf.PdfWriter()
        page = writer.add_blank_page(width=612, height=792)
        
        # Extract content from created PDF
        pdf_byte_arr = io.BytesIO()
        writer.write(pdf_byte_arr)
        pdf_bytes = pdf_byte_arr.getvalue()

        pdf_info = extract_pdf_content(pdf_bytes)
        self.assertEqual(pdf_info["page_count"], 1)

        # Test extraction pipeline
        sample_pdf_text = "Festa del Tartufo di Norcia\nDal 20 al 28 Febbraio 2026 a Norcia (PG)\nDegustazione frittata al tartufo e salumi."
        item = self.agent.extract_from_text(sample_pdf_text)
        self.assertEqual(item.city, "Norcia")
        self.assertEqual(item.province, "PG")

    def test_town_image_fallback(self):
        sample_text = "Festa del Vino a Montefalco\nDal 1 al 5 Ottobre 2026 a Montefalco (PG)"
        item = self.agent.extract_from_text(sample_text)
        self.assertEqual(item.city, "Montefalco")
        self.assertIsNotNone(item.image_url)
        self.assertTrue(item.image_url.startswith("https://upload.wikimedia.org/"))


if __name__ == "__main__":
    unittest.main()
