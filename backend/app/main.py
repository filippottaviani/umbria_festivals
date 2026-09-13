import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.endpoints import router
from app.core.database import Base, engine
import app.models.festival
import app.models.review
import app.models.submission

from sqlalchemy import text

try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE festivals ADD COLUMN IF NOT EXISTS program_info TEXT;"))
        conn.commit()
except Exception as e:
    print(f"Warning: Database initialization on startup skipped: {e}")

class CachedStaticFiles(StaticFiles):
    async def file_response(self, *args, **kwargs):
        response = await super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=86400, immutable"
        return response

app = FastAPI(title="Sagra Umbra API")

os.makedirs("uploads/posters", exist_ok=True)
app.mount("/uploads", CachedStaticFiles(directory="uploads"), name="uploads")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)