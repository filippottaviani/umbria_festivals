import scrapy
from datetime import datetime
from typing import Optional
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

            if not item.get("name") and not item.get("source_url"):
                self.logger.debug("Skip evento senza nome o URL: %r", event.get())
                continue

            yield item

        next_page = response.css(
            "a.next::attr(href), a[rel='next']::attr(href), .pagination a.next::attr(href), .next-page::attr(href)"
        ).get()
        if next_page:
            yield response.follow(next_page, self.parse, meta={"playwright": True})

    def format_date(self, date_string: str) -> Optional[str]:
        if not date_string:
            return None
        return datetime.strptime(date_string.strip(), "%d/%m/%Y").date().isoformat()

    def parse(self, response):
        events = response.css(
            "article.event, div.event, li.event, section.event, div[class*='event'], li[class*='event'], section[class*='event'], div[class*='evento'], li[class*='evento'], section[class*='evento']"
        )

        if not events:
            self.logger.warning(
                "Nessun evento trovato su %s. La pagina potrebbe essere cambiata o il dominio potrebbe essere parcheggiato.",
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

            if not item.get("name") and not item.get("source_url"):
                self.logger.debug("Skip evento senza nome o URL: %r", event.get())
                continue

            yield item

        next_page = response.css(
            "a.next::attr(href), a[rel='next']::attr(href), .pagination a.next::attr(href), .next-page::attr(href)"
        ).get()
        if next_page:
            yield response.follow(next_page, self.parse, meta={"playwright": True})

    def format_date(self, date_string: str) -> Optional[str]:
        if not date_string:
            return None
        return datetime.strptime(date_string.strip(), "%d/%m/%Y").date().isoformat()