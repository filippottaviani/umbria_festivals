import sys
if sys.platform.startswith("win"):
    import asyncio
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from umbria_festivals.spiders.proloco_spiders import ProlocoSpider

if __name__ == '__main__':
    process = CrawlerProcess(get_project_settings())
    process.crawl(ProlocoSpider)
    process.start()
