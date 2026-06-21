import requests
import re

url = 'https://www.staserasagra.it/'
r = requests.get(url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
text = r.text.lower()
links = re.findall(r'href=["\']([^"\']+)["\']', text)
links = [l for l in links if any(k in l for k in ['sagra', 'event', 'post', 'categoria', 'umbria', 'feste'])]
print('found', len(links), 'candidate links')
for l in sorted(set(links)):
    print(l)
