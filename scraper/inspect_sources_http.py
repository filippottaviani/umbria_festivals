import requests

urls = [
    "https://www.umbriaeventi.com/",
    "https://www.staserasagra.it/",
    "https://www.sagreumbre.it/",
    "https://sagritaly.com/regioni-sagre/umbria/",
]

for url in urls:
    print("URL:", url)
    try:
        response = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        print("  status:", response.status_code)
        print("  content-length:", len(response.text))
        print("  snippet:", response.text[:300])
        print("  ---")
    except Exception as e:
        print("  error:", str(e))
        print("  ---")
