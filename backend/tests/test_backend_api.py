import unittest
import sys
import os
import io
import uuid

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.cache import global_cache

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


class TestBackendAPI(unittest.TestCase):
    def setUp(self):
        global_cache.invalidate_all()
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)

    def tearDown(self):
        global_cache.invalidate_all()
        Base.metadata.drop_all(bind=engine)

    def test_create_and_get_festival(self):
        payload = {
            "name": "Sagra del Tartufo",
            "city": "Gubbio",
            "province": "PG",
            "latitude": 43.3555,
            "longitude": 12.5769,
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "source_url": "https://example.com/tartufo-gubbio",
            "description": "Sagra enogastronomica dedicata al tartufo di Gubbio",
            "dish_info": "Tartufo fresco e strangozzi"
        }

        # Test CREATE
        response = self.client.post("/api/v1/festivals/", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        data = response.json()
        self.assertEqual(data["name"], payload["name"])
        self.assertEqual(data["city"], "Gubbio")
        festival_id = data["id"]

        # Test GET LIST
        list_response = self.client.get("/api/v1/festivals/")
        self.assertEqual(list_response.status_code, 200)
        festivals = list_response.json()
        self.assertEqual(len(festivals), 1)
        self.assertEqual(festivals[0]["id"], festival_id)

        # Test GET BY ID
        single_response = self.client.get(f"/api/v1/festivals/{festival_id}")
        self.assertEqual(single_response.status_code, 200)
        self.assertEqual(single_response.json()["id"], festival_id)

    def test_caching_and_invalidation(self):
        payload = {
            "name": "Sagra della Porchetta",
            "city": "Costano",
            "province": "PG",
            "latitude": 43.0500,
            "longitude": 12.5500,
            "start_date": "2026-08-18",
            "end_date": "2026-08-25",
            "source_url": "https://example.com/porchetta-costano"
        }
        self.client.post("/api/v1/festivals/", json=payload)

        # First request populates cache
        res1 = self.client.get("/api/v1/festivals/")
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(len(res1.json()), 1)

        # Cache key should be set
        self.assertIsNotNone(global_cache.get("festivals_list:ALL"))

        # Mutate data (create new festival) -> cache should invalidate automatically
        self.client.post("/api/v1/festivals/", json={
            "name": "Sagra delle Frittelle",
            "city": "Pozzo",
            "province": "PG",
            "latitude": 42.9150,
            "longitude": 12.5320,
            "start_date": "2026-07-20",
            "end_date": "2026-07-25",
            "source_url": "https://example.com/frittelle-pozzo"
        })

        # Cache key invalidated
        self.assertIsNone(global_cache.get("festivals_list:ALL"))

        # Next request returns fresh updated list (2 items)
        res2 = self.client.get("/api/v1/festivals/")
        self.assertEqual(len(res2.json()), 2)

    def test_update_and_delete_festival(self):
        payload = {
            "name": "Sagra della Cipolla",
            "city": "Cannara",
            "province": "PG",
            "latitude": 42.9944,
            "longitude": 12.5833,
            "start_date": "2026-09-01",
            "end_date": "2026-09-10",
            "source_url": "https://example.com/cipolla-cannara"
        }
        create_res = self.client.post("/api/v1/festivals/", json=payload)
        festival_id = create_res.json()["id"]

        # Test PUT UPDATE
        update_payload = {"description": "Edizione speciale 2026 della Sagra della Cipolla"}
        update_res = self.client.put(f"/api/v1/festivals/{festival_id}", json=update_payload)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["description"], "Edizione speciale 2026 della Sagra della Cipolla")

        # Test DELETE
        del_res = self.client.delete(f"/api/v1/festivals/{festival_id}")
        self.assertEqual(del_res.status_code, 204)

        # Verify 404 after delete
        get_res = self.client.get(f"/api/v1/festivals/{festival_id}")
        self.assertEqual(get_res.status_code, 404)

    def test_reviews_workflow(self):
        payload = {
            "name": "Sagra dell'Oca",
            "city": "Pozzo",
            "province": "PG",
            "latitude": 42.9150,
            "longitude": 12.5320,
            "start_date": "2026-07-20",
            "end_date": "2026-07-25",
            "source_url": "https://example.com/oca-pozzo"
        }
        create_res = self.client.post("/api/v1/festivals/", json=payload)
        festival_id = create_res.json()["id"]

        # Post Review 1
        r1 = self.client.post(f"/api/v1/festivals/{festival_id}/reviews", json={
            "author_name": "Marco",
            "rating": 5,
            "comment": "Oca arrostita spettacolare e ottima organizzazione!"
        })
        self.assertEqual(r1.status_code, 201)

        # Post Review 2
        r2 = self.client.post(f"/api/v1/festivals/{festival_id}/reviews", json={
            "author_name": "Giulia",
            "rating": 4,
            "comment": "Molto buono, servizio veloce."
        })
        self.assertEqual(r2.status_code, 201)

        # Get Reviews Summary
        summary_res = self.client.get(f"/api/v1/festivals/{festival_id}/reviews")
        self.assertEqual(summary_res.status_code, 200)
        summary = summary_res.json()
        self.assertEqual(summary["review_count"], 2)
        self.assertEqual(summary["average_rating"], 4.5)
        self.assertEqual(summary["rating_breakdown"]["5"], 1)
        self.assertEqual(summary["rating_breakdown"]["4"], 1)

    def test_submissions_workflow(self):
        sub_payload = {
            "submitter_role": "pro_loco",
            "festival_name": "Festa del Vino",
            "city": "Montefalco",
            "province": "PG",
            "start_date": "2026-09-15",
            "end_date": "2026-09-18",
            "contact_email": "proloco@montefalco.it",
            "menu_info": "Sagrantino DOCG e strangozzi al ragù",
            "program_info": "Concerti folk ogni sera"
        }
        sub_res = self.client.post("/api/v1/festivals/submit-info", json=sub_payload)
        self.assertEqual(sub_res.status_code, 201)
        data = sub_res.json()
        self.assertEqual(data["festival_name"], "Festa del Vino")
        self.assertEqual(data["status"], "pending")

        # Get Admin Submissions List
        admin_res = self.client.get("/api/v1/festivals/admin/submissions")
        self.assertEqual(admin_res.status_code, 200)
        submissions = admin_res.json()
        self.assertEqual(len(submissions), 1)
        self.assertEqual(submissions[0]["contact_email"], "proloco@montefalco.it")

    def test_poster_upload(self):
        payload = {
            "name": "Sagra del Porchetto",
            "city": "Norcia",
            "province": "PG",
            "latitude": 42.7931,
            "longitude": 13.0931,
            "start_date": "2026-08-20",
            "end_date": "2026-08-22",
            "source_url": "https://example.com/porchetto-norcia"
        }
        create_res = self.client.post("/api/v1/festivals/", json=payload)
        festival_id = create_res.json()["id"]

        # Upload dummy image poster
        fake_image = io.BytesIO(b"fake image data")
        upload_res = self.client.post(
            f"/api/v1/festivals/{festival_id}/poster",
            files={"file": ("poster.jpg", fake_image, "image/jpeg")}
        )
        self.assertEqual(upload_res.status_code, 200)
        data = upload_res.json()
        self.assertIn("/uploads/posters/poster_", data["image_url"])

    def test_nearby_search(self):
        # Insert 2 festivals: one near Perugia, one far in Orvieto
        self.client.post("/api/v1/festivals/", json={
            "name": "Festa Perugia",
            "city": "Perugia",
            "province": "PG",
            "latitude": 43.1107,
            "longitude": 12.3908,
            "start_date": "2026-07-01",
            "end_date": "2026-07-05",
            "source_url": "https://example.com/perugia"
        })
        self.client.post("/api/v1/festivals/", json={
            "name": "Festa Orvieto",
            "city": "Orvieto",
            "province": "TR",
            "latitude": 42.7186,
            "longitude": 12.1133,
            "start_date": "2026-07-01",
            "end_date": "2026-07-05",
            "source_url": "https://example.com/orvieto"
        })

        # Search nearby Perugia (within 15km)
        res = self.client.get("/api/v1/festivals/search/nearby?latitude=43.1100&longitude=12.3900&radius_km=15")
        self.assertEqual(res.status_code, 200, res.text)
        results = res.json()
        self.assertTrue(len(results) >= 1)
        names = [r["name"] for r in results]
        self.assertIn("Festa Perugia", names)
        self.assertNotIn("Festa Orvieto", names)

    def test_description_generator_preview(self):
        payload = {
            "name": "Festa della Frittella",
            "city": "Pozzo",
            "province": "PG",
            "dish_info": "Frittelle dolci e salate fritte al momento"
        }
        res = self.client.post("/api/v1/festivals/generate-description-preview", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("description", data)
        self.assertTrue(len(data["description"]) > 20)

if __name__ == "__main__":
    unittest.main()
