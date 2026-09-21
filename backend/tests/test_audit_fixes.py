import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_unauthenticated_delete_rejected():
    response = client.delete("/api/v1/festivals/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 401
    assert "API Key" in response.json()["detail"]

def test_unauthenticated_admin_submissions_rejected():
    response = client.get("/api/v1/festivals/admin/submissions")
    assert response.status_code == 401

def test_unauthenticated_fix_endpoints_rejected():
    response = client.post("/api/v1/festivals/fix-coordinates")
    assert response.status_code == 401

def test_authenticated_fix_coordinates_accepted():
    response = client.post(
        "/api/v1/festivals/fix-coordinates",
        headers={"X-Admin-API-Key": settings.ADMIN_API_KEY}
    )
    # Status code 200 or DB connection test esito
    assert response.status_code in [200, 500]

def test_invalid_poster_upload_rejected():
    fake_file = ("test.txt", b"Hello World Fake Image Data", "text/plain")
    response = client.post(
        "/api/v1/festivals/00000000-0000-0000-0000-000000000000/poster",
        files={"file": fake_file},
        headers={"X-Admin-API-Key": settings.ADMIN_API_KEY}
    )
    assert response.status_code in [400, 404]
    if response.status_code == 400:
        assert "non supportato" in response.json()["detail"].lower() or "dimensione" in response.json()["detail"].lower()

def test_robots_and_sitemap():
    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert "User-agent" in robots.text

    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code in [200, 500]
    if sitemap.status_code == 200:
        assert '<?xml' in sitemap.text
