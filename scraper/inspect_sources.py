from playwright.sync_api import sync_playwright

urls = [
    "https://www.umbriaeventi.com/",
    "https://www.staserasagra.it/",
    "https://www.sagreumbre.it/",
    "https://sagritaly.com/regioni-sagre/umbria/",
]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    for url in urls:
        print("URL:", url)
        response = page.goto(url, timeout=60000)
        page.wait_for_load_state("networkidle", timeout=60000)
        print("  status:", response.status if response else "no response")
        print("  title:", page.title())
        print("  h1 count:", page.evaluate("document.querySelectorAll('h1').length"))
        print("  body text:", page.evaluate("document.body.innerText.slice(0,200)"))
        print("  ---")
    browser.close()
