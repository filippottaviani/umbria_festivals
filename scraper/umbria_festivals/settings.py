import sys

# On Windows, the default selector event loop does not support subprocesses.
# Playwright requires subprocess support to launch browsers; set the
# ProactorEventLoopPolicy when running on Windows so create_subprocess_exec
# is available for asyncio.
if sys.platform.startswith("win"):
    try:
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        # If the policy is not available or setting fails, continue and let
        # the runtime surface an error to the user.
        pass

BOT_NAME = "umbria_festivals"
SPIDER_MODULES = ["umbria_festivals.spiders"]
NEWSPIDER_MODULE = "umbria_festivals.spiders"
ROBOTSTXT_OBEY = True
ITEM_PIPELINES = {
    "umbria_festivals.pipelines.PostgreSQLPipeline": 300,
}
DATABASE_URL = "postgresql://postgres:password@localhost:5432/umbriafestivals"
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}
# Use the Windows IOCP reactor when available — it supports subprocesses.
# Requires the 'twisted-iocpsupport' package (already in requirements).
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
PLAYWRIGHT_LAUNCH_OPTIONS = {
    "headless": True,
}