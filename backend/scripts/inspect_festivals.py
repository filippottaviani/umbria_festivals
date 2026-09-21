import sys, json, urllib.request

req = urllib.request.Request("http://localhost:8000/api/v1/festivals/")
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read())

for d in data:
    img = (d.get("image_url") or "")[:80]
    print(f"NAME: {d['name']}\n  city={d['city']} | prov={d['province']}\n  img={img}\n")
