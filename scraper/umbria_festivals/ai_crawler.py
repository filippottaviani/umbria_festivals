"""
Standalone Async AI Crawler & Document Ingestion Runner for Umbria Festivals.
Can process web URLs, PNG/JPG images, and PDF documents directly into
structured Pydantic Festival schemas.
"""

import os
import sys
import asyncio
import logging
import argparse
from typing import List, Union, Dict, Any, Optional
import httpx

from umbria_festivals.ai_agent import AIFestivalAgent, FestivalItemSchema

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class AICrawler:
    """Standalone AI Crawler for web pages, PNG/JPG flyers, and PDF documents."""

    def __init__(self, api_key: Optional[str] = None):
        self.agent = AIFestivalAgent(api_key=api_key)

    async def process_url(self, url: str) -> Optional[FestivalItemSchema]:
        """Fetches content from a web URL and extracts structured festival data."""
        logger.info(f"Crawling URL: {url}")
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    text_content = resp.text
                    return self.agent.extract_from_text(text_content, source_url=url)
                else:
                    logger.error(f"Failed to fetch {url}, status: {resp.status_code}")
            except Exception as e:
                logger.error(f"Error fetching URL {url}: {e}")
        return None

    def process_file(self, file_path: str) -> Optional[FestivalItemSchema]:
        """Processes a local file (PNG, JPG, WEBP, or PDF) using the AI Agent."""
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return None

        ext = os.path.splitext(file_path)[1].lower()
        logger.info(f"Processing local file: {file_path} (extension: {ext})")

        if ext in [".png", ".jpg", ".jpeg", ".webp"]:
            with open(file_path, "rb") as f:
                image_bytes = f.read()
            return self.agent.extract_from_image(image_bytes, source_url=file_path)

        elif ext == ".pdf":
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()
            return self.agent.extract_from_pdf(pdf_bytes, source_url=file_path)

        elif ext in [".html", ".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text_content = f.read()
            return self.agent.extract_from_text(text_content, source_url=file_path)

        else:
            logger.error(f"Unsupported file format: {ext}")
            return None


def main():
    parser = argparse.ArgumentParser(description="Umbria Festivals Standalone AI Crawler & Ingestion Tool")
    parser.add_argument("--url", help="Web page URL to scrape and parse")
    parser.add_argument("--file", help="Path to PNG, JPG, or PDF file to extract")
    args = parser.parse_args()

    crawler = AICrawler()

    if args.url:
        result = asyncio.run(crawler.process_url(args.url))
        if result:
            print("\n=== ESTRATTO DA URL ===")
            print(result.model_dump_json(indent=2))

    elif args.file:
        result = crawler.process_file(args.file)
        if result:
            print("\n=== ESTRATTO DA FILE ===")
            print(result.model_dump_json(indent=2))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
