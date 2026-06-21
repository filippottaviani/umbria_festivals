from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    response = page.goto('https://www.prolocoumbria.it/eventi/', timeout=60000)
    page.wait_for_load_state('networkidle', timeout=60000)
    html = page.content()
    print('PAGE URL:', page.url)
    print('TITLE:', page.title())
    print('STATUS:', response.status if response else 'no response')
    print('ARTICLE COUNT:', page.evaluate('document.querySelectorAll("article").length'))
    print('DIV EVENT COUNT:', page.evaluate('document.querySelectorAll("div").length'))
    print('BODY TEXT START:')
    print(page.evaluate('document.body.innerText.slice(0, 500)'))
    print('BODY HTML START:')
    print(html[:4000])
    browser.close()
