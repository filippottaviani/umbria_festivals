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

    def test_archive_season_filtering_and_stats(self):
        # Insert a 2025 archive event and a 2026 event
        self.client.post("/api/v1/festivals/", json={
            "name": "Sagra Passata 2025",
            "city": "Trevi",
            "province": "PG",
            "latitude": 42.8931,
            "longitude": 12.7461,
            "start_date": "2025-06-10",
            "end_date": "2025-06-15",
            "source_url": "https://example.com/trevi-2025"
        })
        self.client.post("/api/v1/festivals/", json={
            "name": "Sagra Futura 2026",
            "city": "Spello",
            "province": "PG",
            "latitude": 42.9922,
            "longitude": 12.6719,
            "start_date": "2026-10-01",
            "end_date": "2026-10-05",
            "source_url": "https://example.com/spello-2026"
        })

        # Test archive stats endpoint
        stats_res = self.client.get("/api/v1/festivals/archive/stats")
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.json()
        self.assertEqual(stats["status"], "success")
        self.assertEqual(stats["total_archived_festivals"], 2)
        self.assertEqual(stats["by_season"]["2025"], 1)
        self.assertEqual(stats["by_season"]["2026"], 1)
        self.assertEqual(stats["by_status"]["past"], 1)
        self.assertEqual(stats["by_status"]["upcoming"], 1)

        # Test year filtering: year=2025 returns only 2025 event
        y25_res = self.client.get("/api/v1/festivals/?year=2025")
        self.assertEqual(y25_res.status_code, 200)
        y25_data = y25_res.json()
        self.assertEqual(len(y25_data), 1)
        self.assertEqual(y25_data[0]["name"], "Sagra Passata 2025")

        # Test year filtering: year=2026 returns only 2026 event
        y26_res = self.client.get("/api/v1/festivals/?year=2026")
        self.assertEqual(y26_res.status_code, 200)
        y26_data = y26_res.json()
        self.assertEqual(len(y26_data), 1)
        self.assertEqual(y26_data[0]["name"], "Sagra Futura 2026")

        # Test archive_only=True returns past event
        past_res = self.client.get("/api/v1/festivals/?archive_only=true")
        self.assertEqual(past_res.status_code, 200)
        past_data = past_res.json()
        self.assertEqual(len(past_data), 1)
        self.assertEqual(past_data[0]["name"], "Sagra Passata 2025")

    def test_create_festival_different_cities_coexistence(self):
        # Two festivals with the same name in different towns must coexist
        res1 = self.client.post("/api/v1/festivals/", json={
            "name": "Sagra del Cinghiale",
            "city": "Sigillo",
            "province": "PG",
            "latitude": 43.3325,
            "longitude": 12.7417,
            "start_date": "2026-08-10",
            "end_date": "2026-08-15",
            "source_url": "https://example.com/cinghiale-sigillo"
        })
        self.assertEqual(res1.status_code, 201)

        res2 = self.client.post("/api/v1/festivals/", json={
            "name": "Sagra del Cinghiale",
            "city": "Narni",
            "province": "TR",
            "latitude": 42.5181,
            "longitude": 12.5153,
            "start_date": "2026-08-12",
            "end_date": "2026-08-16",
            "source_url": "https://example.com/cinghiale-narni"
        })
        self.assertEqual(res2.status_code, 201)

        # Both records must be preserved
        list_res = self.client.get("/api/v1/festivals/")
        festivals = list_res.json()
        cities = {f["city"] for f in festivals}
        self.assertIn("Sigillo", cities)
        self.assertIn("Narni", cities)

    def test_create_festival_overlap_enrichment(self):
        # Create initial festival with placeholder text
        res1 = self.client.post("/api/v1/festivals/", json={
            "name": "Sagra della Lumaca",
            "city": "Bevagna",
            "province": "PG",
            "latitude": 42.9328,
            "longitude": 12.6094,
            "start_date": "2026-07-10",
            "end_date": "2026-07-12",
            "source_url": "https://example.com/lumaca-bevagna-v1",
            "description": "Breve testo"
        })
        self.assertEqual(res1.status_code, 201)
        initial_id = res1.json()["id"]

        # Post overlapping festival with richer description and extended dates
        res2 = self.client.post("/api/v1/festivals/", json={
            "name": "Sagra della Lumaca di Bevagna",
            "city": "Bevagna",
            "province": "PG",
            "latitude": 42.9328,
            "longitude": 12.6094,
            "start_date": "2026-07-09",
            "end_date": "2026-07-14",
            "source_url": "https://example.com/lumaca-bevagna-v2",
            "description": "Descrizione estesa ed autentica della Sagra della Lumaca tra le mura medievali.",
            "menu_info": "- Lumache in umido alla bevagnate\n- Strangozzi al tartufo"
        })
        self.assertEqual(res2.status_code, 201)
        enriched = res2.json()
        # Must retain the original ID
        self.assertEqual(enriched["id"], initial_id)
        # Must have widened dates
        self.assertEqual(enriched["start_date"], "2026-07-09")
        self.assertEqual(enriched["end_date"], "2026-07-14")
        # Must have richer description and menu
        self.assertIn("Descrizione estesa", enriched["description"])
        self.assertIn("Lumache in umido", enriched["menu_info"])

    def test_create_festival_url_based_integration(self):
        # Create festival with source_url
        res1 = self.client.post("/api/v1/festivals/", json={
            "name": "Sagra del Fungo",
            "city": "Foligno",
            "province": "PG",
            "latitude": 42.9561,
            "longitude": 12.7034,
            "start_date": "2026-09-05",
            "end_date": "2026-09-10",
            "source_url": "https://example.com/fungo-foligno",
            "description": "Prima stesura",
            "menu_info": "- Tagliatelle ai funghi"
        })
        self.assertEqual(res1.status_code, 201)
        initial_id = res1.json()["id"]

        # Resubmit with same URL in same year, different wording
        res2 = self.client.post("/api/v1/festivals/", json={
            "name": "Festa dei Funghi di Bosco",
            "city": "Foligno",
            "province": "PG",
            "latitude": 42.9561,
            "longitude": 12.7034,
            "start_date": "2026-09-05",
            "end_date": "2026-09-12",
            "source_url": "https://example.com/fungo-foligno",
            "description": "Seconda stesura più ricca ed approfondita sulla tradizione micologica umbra.",
            "menu_info": "- Zuppa di farro e funghi"
        })
        self.assertEqual(res2.status_code, 201)
        data = res2.json()
        self.assertEqual(data["id"], initial_id)
        self.assertEqual(data["end_date"], "2026-09-12")
        self.assertIn("Seconda stesura", data["description"])
        self.assertIn("Tagliatelle ai funghi", data["menu_info"])
        self.assertIn("Zuppa di farro", data["menu_info"])

    def test_create_festival_placeholder_date_replacement(self):
        # Single-day placeholder
        res1 = self.client.post("/api/v1/festivals/", json={
            "name": "Sagra del Tartufo Bianco",
            "city": "Pietralunga",
            "province": "PG",
            "latitude": 43.4428,
            "longitude": 12.4361,
            "start_date": "2026-10-01",
            "end_date": "2026-10-01",
            "source_url": "https://example.com/tartufo-pietralunga",
            "description": "Sagra del tartufo"
        })
        self.assertEqual(res1.status_code, 201)
        initial_id = res1.json()["id"]

        # Multi-day real dates later submitted
        res2 = self.client.post("/api/v1/festivals/", json={
            "name": "Sagra del Tartufo Bianco",
            "city": "Pietralunga",
            "province": "PG",
            "latitude": 43.4428,
            "longitude": 12.4361,
            "start_date": "2026-10-09",
            "end_date": "2026-10-12",
            "source_url": "https://example.com/tartufo-pietralunga",
            "description": "Sagra del tartufo a Pietralunga"
        })
        self.assertEqual(res2.status_code, 201)
        data = res2.json()
        self.assertEqual(data["id"], initial_id)
        # Single-day placeholder replaced with authentic multi-day range
        self.assertEqual(data["start_date"], "2026-10-09")
        self.assertEqual(data["end_date"], "2026-10-12")

    def test_archive_preserves_older_years_without_truncation(self):
        # Insert 2024, 2025, 2026 events
        for yr in [2024, 2025, 2026]:
            self.client.post("/api/v1/festivals/", json={
                "name": f"Sagra dell'Olio {yr}",
                "city": "Trevi",
                "province": "PG",
                "latitude": 42.8931,
                "longitude": 12.7461,
                "start_date": f"{yr}-11-01",
                "end_date": f"{yr}-11-05",
                "source_url": f"https://example.com/olio-{yr}"
            })

        # Default GET /api/v1/festivals/ includes all past archived events, including 2024
        all_res = self.client.get("/api/v1/festivals/")
        self.assertEqual(all_res.status_code, 200)
        items = all_res.json()
        years = {item["start_date"][:4] for item in items}
        self.assertIn("2024", years)
        self.assertIn("2025", years)
        self.assertIn("2026", years)

if __name__ == "__main__":
    unittest.main()
