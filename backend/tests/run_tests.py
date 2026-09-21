import sys
import os
from unittest.mock import MagicMock
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.database import get_db

# Override get_db with a mock DB session
def override_get_db():
    mock_db = MagicMock()
    mock_db.query.return_value.all.return_value = []
    mock_db.query.return_value.filter.return_value.all.return_value = []
    mock_db.query.return_value.filter.return_value.first.return_value = None
    yield mock_db

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def run():
    print("--- INIZIO VERIFICA AUTOMATIZZATA COMPLETA ---")
    
    # Test 1: DELETE senza API Key -> Rifiutato 401
    r1 = client.delete("/api/v1/festivals/00000000-0000-0000-0000-000000000000")
    print(f"[1] DELETE senza API Key -> Status: {r1.status_code}")
    assert r1.status_code == 401, f"Expected 401, got {r1.status_code}"
    
    # Test 2: Admin Submissions senza API Key -> Rifiutato 401
    r2 = client.get("/api/v1/festivals/admin/submissions")
    print(f"[2] GET /admin/submissions senza API Key -> Status: {r2.status_code}")
    assert r2.status_code == 401, f"Expected 401, got {r2.status_code}"

    # Test 3: Maintenance fix senza API Key -> Rifiutato 401
    r3 = client.post("/api/v1/festivals/fix-coordinates")
    print(f"[3] POST /fix-coordinates senza API Key -> Status: {r3.status_code}")
    assert r3.status_code == 401, f"Expected 401, got {r3.status_code}"

    # Test 4a: Maintenance fix con API Key errata -> Rifiutato 401
    r4_bad = client.post("/api/v1/festivals/fix-coordinates", headers={"X-Admin-API-Key": "wrong_key"})
    print(f"[4a] POST /fix-coordinates con API Key errata -> Status: {r4_bad.status_code}")
    assert r4_bad.status_code == 401, f"Expected 401, got {r4_bad.status_code}"

    # Test 4b: Maintenance fix con API Key valida -> Supera la sicurezza Admin (Status 200)
    r4 = client.post("/api/v1/festivals/fix-coordinates", headers={"X-Admin-API-Key": settings.ADMIN_API_KEY})
    print(f"[4b] POST /fix-coordinates con API Key valida -> Status: {r4.status_code} (Autenticato correttamente)")
    assert r4.status_code == 200, f"Expected 200, got {r4.status_code}"

    # Test 5: Upload locandina file non-immagine -> Rifiutato 400
    fake_file = ("test.txt", b"Questo e' un file di testo non immagine", "text/plain")
    r5 = client.post(
        "/api/v1/festivals/00000000-0000-0000-0000-000000000000/poster",
        files={"file": fake_file},
        headers={"X-Admin-API-Key": settings.ADMIN_API_KEY}
    )
    print(f"[5] POST poster con file non-immagine -> Status: {r5.status_code}")
    assert r5.status_code in [400, 404], f"Expected 400/404, got {r5.status_code}"
    if r5.status_code == 400:
        print(f"     Messaggio Errore: {r5.json().get('detail')}")

    # Test 6: Robots.txt ed Endpoint Pubblici
    r6 = client.get("/robots.txt")
    print(f"[6] GET /robots.txt -> Status: {r6.status_code}")
    assert r6.status_code == 200
    assert "Disallow: /admin" in r6.text

    print("\n[OK] TUTTI I TEST DI VERIFICA SICUREZZA ED AUTENTICAZIONE SONO SUPERATI CON SUCCESSO!")

if __name__ == "__main__":
    run()
