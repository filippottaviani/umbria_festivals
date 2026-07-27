import urllib.request, json

payload = {
    "name": "Test Festival Admin",
    "city": "Perugia",
    "province": "PG",
    "latitude": 43.1107,
    "longitude": 12.3908,
    "start_date": "2026-08-01",
    "end_date": "2026-08-10",
    "source_url": "https://test.example.com/test-admin-xyz"
}
data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(
    "http://localhost:8000/api/v1/festivals/",
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST"
)
try:
    with urllib.request.urlopen(req) as r:
        result = json.loads(r.read())
        print("CREATE OK:", result["id"], result["name"])
        
        # Test PUT
        put_payload = {"description": "Descrizione aggiornata da test"}
        put_data = json.dumps(put_payload).encode('utf-8')
        put_req = urllib.request.Request(
            f"http://localhost:8000/api/v1/festivals/{result['id']}",
            data=put_data,
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        with urllib.request.urlopen(put_req) as r2:
            r2_body = json.loads(r2.read())
            print("UPDATE OK:", r2_body["description"])

        # Test DELETE
        del_req = urllib.request.Request(
            f"http://localhost:8000/api/v1/festivals/{result['id']}",
            method="DELETE"
        )
        with urllib.request.urlopen(del_req) as r3:
            print("DELETE OK: status", r3.status)
except Exception as e:
    print("ERROR:", e)
