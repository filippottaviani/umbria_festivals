import requests
import re

url = 'https://www.staserasagra.it/sagre/giugno-in-festa-2026'
r = requests.get(url, timeout=30, headers={'User-Agent':'Mozilla/5.0'})
text = r.text
print('status', r.status_code, 'len', len(text))
for term in ['sagre', 'sagra', 'article', 'post', 'href="/sagre', 'elementor', 'data-id', 'class="']:
    if term in text.lower():
        print(' contains', term)
print('--- snippets ---')
for m in re.finditer(r'(<(?:div|article|section|li)[^>]*?(?:sagre|sagra|post|event)[^>]*>.*?</(?:div|article|section|li)>)', text, re.I|re.S):
    print(m.group(1)[:800].replace('\n',' ').replace('\r',' '))
    break
