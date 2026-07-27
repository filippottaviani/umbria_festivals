import urllib.request
import re

url = "https://sagritaly.com/sagra/piccantissima-pila"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read().decode('utf-8')
    images = set(re.findall(r'https://[^"\'\s]+\.jpg', html))
    print("Found images:", images)
except Exception as e:
    print(e)
