import re
from datetime import datetime
from typing import Optional

import scrapy

from umbria_festivals.items import FestivalItem
from umbria_festivals.sources import SOURCES


class ProlocoSpider(scrapy.Spider):
    """Spider implementation for extracting festival data from multiple reliable sources."""

    name = "proloco"
    allowed_domains = [source["domain"] for source in SOURCES]
    start_urls = []
    for source in SOURCES:
        start_urls.extend(source["start_urls"])

    def start_requests(self):
        for url in self.start_urls:
            yield scrapy.Request(url, callback=self.parse, meta={"playwright": True})

    def parse(self, response):
        events = response.css(
            "article.event, div.event, li.event, section.event, div[class*='event'], li[class*='event'], section[class*='event'], div[class*='evento'], li[class*='evento'], section[class*='evento']"
        )

        if not events:
            self.logger.warning(
                "Nessun evento trovato su %s. La pagina potrebbe essere cambiata o il selettore potrebbe non corrispondere.",
                response.url,
            )
            return

        for event in events:
            item = FestivalItem()
            item["name"] = event.css(
                "h2.entry-title a::text, h3.entry-title a::text, h2 a::text, h3 a::text, .title a::text, .event-title::text"
            ).get()
            item["city"] = event.css(
                "span.city::text, .city::text, span[class*='city']::text, [class*='city']::text"
            ).get()
            item["province"] = event.css(
                "span.province::text, .province::text, span[class*='province']::text, [class*='province']::text"
            ).get()
            latitude = event.css(
                "span.lat::text, .lat::text, ::attr(data-lat), ::attr(data-latitude)"
            ).get()
            longitude = event.css(
                "span.lng::text, .lng::text, ::attr(data-lng), ::attr(data-longitude)"
            ).get()
            item["latitude"] = float(latitude or 0.0)
            item["longitude"] = float(longitude or 0.0)
            start_date_str = event.css(
                "span.start-date::text, .start-date::text, span[class*='start']::text, .date-start::text"
            ).get()
            end_date_str = event.css(
                "span.end-date::text, .end-date::text, span[class*='end']::text, .date-end::text"
            ).get()
            item["start_date"] = self.format_date(start_date_str)
            item["end_date"] = self.format_date(end_date_str)
            item["source_url"] = event.css(
                "h2.entry-title a::attr(href), h3.entry-title a::attr(href), h2 a::attr(href), h3 a::attr(href), a::attr(href)"
            ).get()

            if not item.get("name") or not item.get("city") or not item.get("province") or not item.get("start_date") or not item.get("end_date") or not item.get("source_url"):
                self.logger.debug("Skip evento incompleto: %r", event.get())
                continue

            yield item

        next_page = response.css(
            "a.next::attr(href), a[rel='next']::attr(href), .pagination a.next::attr(href), .next-page::attr(href)"
        ).get()
        if next_page:
            yield response.follow(next_page, self.parse, meta={"playwright": True})

    def format_date(self, date_string: Optional[str]) -> Optional[str]:
        if not date_string:
            return None

        raw_value = re.sub(r"\s+", " ", date_string.strip())
        if not raw_value:
            return None

        for candidate in self._extract_date_candidates(raw_value):
            for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m", "%d-%m"):
                try:
                    return datetime.strptime(candidate, fmt).date().isoformat()
                except ValueError:
                    continue

        return None

    def _extract_date_candidates(self, raw_value: str):
        candidates = []
        cleaned = raw_value.replace("\u2013", "-").replace("\u2014", "-").replace("/", "/")
        cleaned = re.sub(r"\s*[-–—]\s*", "-", cleaned)

        if " al " in cleaned.lower():
            parts = re.split(r"\s+al\s+", cleaned, flags=re.IGNORECASE)
            candidates.extend(part.strip() for part in parts if part.strip())
        elif " a " in cleaned.lower():
            parts = re.split(r"\s+a\s+", cleaned, flags=re.IGNORECASE)
            candidates.extend(part.strip() for part in parts if part.strip())
        else:
            candidates.append(cleaned)

        return [candidate for candidate in candidates if candidate]