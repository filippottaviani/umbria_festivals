import scrapy
from datetime import datetime
from typing import Optional
from umbria_festivals.items import FestivalItem

class ProlocoSpider(scrapy.Spider):
    """Spider implementation for extracting festival data from local portals."""
    name = "proloco"
    allowed_domains = ["prolocoumbria.it"]
    start_urls = ["https://www.prolocoumbria.it/eventi/"]

    def start_requests(self):
        for url in self.start_urls:
            yield scrapy.Request(url, callback=self.parse, meta={"playwright": True})

    def parse(self, response):
        events = response.css("article.event")
        for event in events:
            item = FestivalItem()
            item["name"] = event.css("h2.entry-title a::text").get()
            item["city"] = event.css("span.city::text").get()
            item["province"] = event.css("span.province::text").get()
            item["latitude"] = float(event.css("span.lat::text").get() or 0.0)
            item["longitude"] = float(event.css("span.lng::text").get() or 0.0)
            start_date_str = event.css("span.start-date::text").get()
            end_date_str = event.css("span.end-date::text").get()
            item["start_date"] = self.format_date(start_date_str)
            item["end_date"] = self.format_date(end_date_str)
            item["source_url"] = event.css("h2.entry-title a::attr(href)").get()
            yield item

        next_page = response.css("a.next::attr(href)").get()
        if next_page:
            yield response.follow(next_page, self.parse)

    def format_date(self, date_string: str) -> Optional[str]:
        if not date_string:
            return None
        return datetime.strptime(date_string.strip(), "%d/%m/%Y").date().isoformat()