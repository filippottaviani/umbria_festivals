import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.endpoints import router
from app.core.database import Base, engine
import app.models.festival
import app.models.review
import app.models.submission
import app.models.city
import app.models.geocode

from sqlalchemy import text

try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE festivals ADD COLUMN IF NOT EXISTS program_info TEXT;"))
        conn.execute(text("ALTER TABLE festivals ADD COLUMN IF NOT EXISTS is_verified_dates TEXT DEFAULT 'VERIFIED';"))
        conn.execute(text("ALTER TABLE festivals ADD COLUMN IF NOT EXISTS verification_source TEXT;"))
        conn.execute(text("ALTER TABLE festivals ADD COLUMN IF NOT EXISTS dish_image_url TEXT;"))
        conn.execute(text("ALTER TABLE festivals ADD COLUMN IF NOT EXISTS content_verified BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE festivals ADD COLUMN IF NOT EXISTS peer_review_score INTEGER DEFAULT 100;"))
        conn.execute(text("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images TEXT;"))
        conn.commit()
except Exception as e:
    print(f"Warning: Database initialization on startup skipped: {e}")

class CachedStaticFiles(StaticFiles):
    async def file_response(self, *args, **kwargs):
        response = await super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=86400, immutable"
        return response

app = FastAPI(title="Sagra Umbra API")

from app.core.config import settings

os.makedirs("uploads/posters", exist_ok=True)
os.makedirs("uploads/dishes", exist_ok=True)
os.makedirs("uploads/reviews", exist_ok=True)
app.mount("/uploads", CachedStaticFiles(directory="uploads"), name="uploads")

# Enable CORS for frontend with configured allowed origins
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

from fastapi.responses import Response, PlainTextResponse
from app.core.database import get_db
from app.models.festival import FestivalModel
from sqlalchemy.orm import Session
from fastapi import Depends
import html

SITE_URL = os.environ.get("SITE_URL", "https://sagraumbra.it")

@app.get("/robots.txt", response_class=PlainTextResponse, tags=["SEO"])
def get_robots_txt():
    content = f"""# Robots.txt per Sagra Umbra (https://sagraumbra.it)
# Conforme a RFC 9309

User-agent: *
Allow: /
Allow: /uploads/
Disallow: /admin
Disallow: /admin/
Disallow: /api/

# Crawler AI di Ricerca (Consentiti per visibilità nei risultati AI / GEO)
User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot
Allow: /

# Crawler di solo addestramento LLM (Limitati per proteggere i contenuti)
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

# Sitemap ufficiale
Sitemap: {SITE_URL}/sitemap.xml
"""
    return PlainTextResponse(content=content.strip() + "\n", media_type="text/plain")


@app.get("/sitemap.xml", response_class=Response, tags=["SEO"])
def get_dynamic_sitemap(db: Session = Depends(get_db)):
    from datetime import date
    today_str = date.today().isoformat()
    
    # Static primary routes
    routes = [
        {"loc": f"{SITE_URL}/", "lastmod": today_str, "changefreq": "daily", "priority": "1.0", "img": f"{SITE_URL}/icon.svg", "title": "Sagra Umbra — Portale delle Sagre dei Borghi Umbri"},
        {"loc": f"{SITE_URL}/mappa", "lastmod": today_str, "changefreq": "weekly", "priority": "0.9"},
        {"loc": f"{SITE_URL}/calendario", "lastmod": today_str, "changefreq": "weekly", "priority": "0.9"},
        {"loc": f"{SITE_URL}/archivio", "lastmod": today_str, "changefreq": "weekly", "priority": "0.8"},
        {"loc": f"{SITE_URL}/segnala-sagra", "lastmod": today_str, "changefreq": "monthly", "priority": "0.7"},
    ]
    
    # Query only lightweight columns for sitemap generation
    try:
        festivals = db.query(
            FestivalModel.id,
            FestivalModel.start_date,
            FestivalModel.image_url,
            FestivalModel.name,
            FestivalModel.city,
            FestivalModel.province
        ).filter(FestivalModel.province.in_(["PG", "TR"])).all()
        
        for f_id, f_start_date, f_image_url, f_name, f_city, f_province in festivals:
            lastmod = f_start_date.isoformat() if f_start_date else today_str
            img_url = None
            if f_image_url:
                img_url = f_image_url if f_image_url.startswith("http") else f"{SITE_URL}{f_image_url}"
            routes.append({
                "loc": f"{SITE_URL}/festival/{f_id}",
                "lastmod": lastmod,
                "changefreq": "weekly",
                "priority": "0.8",
                "img": img_url,
                "title": f"{f_name} - {f_city} ({f_province})"
            })
    except Exception as e:
        print(f"Warning generating dynamic sitemap from DB: {e}")

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
    ]
    
    for r in routes:
        loc = html.escape(r["loc"])
        xml_lines.append("  <url>")
        xml_lines.append(f"    <loc>{loc}</loc>")
        xml_lines.append(f"    <lastmod>{r['lastmod']}</lastmod>")
        xml_lines.append(f"    <changefreq>{r['changefreq']}</changefreq>")
        xml_lines.append(f"    <priority>{r['priority']}</priority>")
        if r.get("img"):
            img_loc = html.escape(r["img"])
            img_title = html.escape(r.get("title", ""))
            xml_lines.append("    <image:image>")
            xml_lines.append(f"      <image:loc>{img_loc}</image:loc>")
            if img_title:
                xml_lines.append(f"      <image:title>{img_title}</image:title>")
            xml_lines.append("    </image:image>")
        xml_lines.append("  </url>")
        
    xml_lines.append("</urlset>")
    xml_content = "\n".join(xml_lines)
    return Response(content=xml_content, media_type="application/xml")