import requests
import re
from collections import Counter

urls = [
    'https://www.umbriaeventi.com/',
    'https://www.staserasagra.it/',
    'https://www.sagreumbre.it/',
    'https://sagritaly.com/regioni-sagre/umbria/',
]

for url in urls:
    print('URL:', url)
    try:
        r = requests.get(url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        html = r.text
        print(' status', r.status_code, 'len', len(html))
        classes = re.findall(r'class=["\']([^"\']+)["\']', html, re.I)
        ids = re.findall(r'id=["\']([^"\']+)["\']', html, re.I)
        keywords = ['evento', 'sagra', 'festival', 'article', 'card', 'list', 'item', 'post']
        found = {kw: html.lower().count(kw) for kw in keywords}
        print('  keyword counts', found)
        counter = Counter()
        for cls in classes:
            for part in cls.split():
                counter[part] += 1
        print('  top classes:', counter.most_common(20))
        counter_id = Counter(ids)
        print('  top ids:', counter_id.most_common(20))
        snippets = re.findall(r'(<(?:article|div|section|li|ul)[^>]*>(?:.|\n){0,500}?</(?:article|div|section|li|ul)>)', html, re.I)
        print('  found block count', len(snippets))
        if snippets:
            print('  sample block:', snippets[0][:800].replace('\n', ' ').replace('\r', ' '))
        # show specific selectors if present
        for selector in ['event-title', 'event-date', 'itemPosts', 'w-post-elm', 'post_title', 'featuredEvents']:
            if selector in html:
                snippets = re.findall(r'.{0,100}%s.{0,100}' % re.escape(selector), html, re.I)
                if snippets:
                    print('  selector sample for', selector, snippets[0].replace('\n', ' ').replace('\r', ' '))
    except Exception as e:
        print(' error', e)
    print('---')
