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

class TestNewFeatures(unittest.TestCase):
    def setUp(self):
        global_cache.invalidate_all()
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)

        # Create a sample festival
        payload = {
            "name": "Festa della Cipolla",
            "city": "Cannara",
            "province": "PG",
            "latitude": 42.9944,
            "longitude": 12.5833,
            "start_date": "2026-09-02",
            "end_date": "2026-09-13",
            "source_url": "https://cannara.it/festa-cipolla-2026",
            "dish_info": "Penne alla cipollara e cipolle ripiene"
        }
        res = self.client.post("/api/v1/festivals/", json=payload)
        self.assertEqual(res.status_code, 201)
        self.fest_id = res.json()["id"]

    def tearDown(self):
        global_cache.invalidate_all()
        Base.metadata.drop_all(bind=engine)

    def test_dish_image_upload(self):
        headers = {"X-Admin-API-Key": "sagra_umbra_admin_secret_key_2026"}
        fake_jpeg = b'\xff\xd8\xff\xe0\x00\x10JFIF' + b'\x00' * 50
        file_obj = io.BytesIO(fake_jpeg)

        res = self.client.post(
            f"/api/v1/festivals/{self.fest_id}/dish-image",
            files={"file": ("cipollara.jpg", file_obj, "image/jpeg")},
            headers=headers
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("dish_image_url", data)
        self.assertTrue(data["dish_image_url"].startswith("/uploads/dishes/"))

        # Verify GET returns dish_image_url
        get_res = self.client.get(f"/api/v1/festivals/{self.fest_id}")
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["dish_image_url"], data["dish_image_url"])

    def test_review_photo_upload_and_review_with_images(self):
        # 1. Upload a review photo
        fake_png = b'\x89PNG\r\n\x1a\n' + b'\x00' * 50
        file_obj = io.BytesIO(fake_png)

        photo_res = self.client.post(
            f"/api/v1/festivals/{self.fest_id}/reviews/photos",
            files={"file": ("piatto.png", file_obj, "image/png")}
        )
        self.assertEqual(photo_res.status_code, 200)
        photo_url = photo_res.json()["url"]
        self.assertTrue(photo_url.startswith("/uploads/reviews/"))

        # 2. Post review with images array
        rev_payload = {
            "author_name": "Leonardo da Foligno",
            "rating": 5,
            "comment": "Cipolle caramellate strepitose! Ecco la foto del piatto.",
            "images": [photo_url]
        }
        rev_res = self.client.post(
            f"/api/v1/festivals/{self.fest_id}/reviews",
            json=rev_payload
        )
        self.assertEqual(rev_res.status_code, 201)
        created_rev = rev_res.json()
        self.assertEqual(created_rev["images"], [photo_url])

        # 3. Fetch reviews summary and verify images
        summary_res = self.client.get(f"/api/v1/festivals/{self.fest_id}/reviews")
        self.assertEqual(summary_res.status_code, 200)
        summary_data = summary_res.json()
        self.assertEqual(summary_data["review_count"], 1)
        self.assertEqual(summary_data["reviews"][0]["images"], [photo_url])

if __name__ == '__main__':
    unittest.main()
