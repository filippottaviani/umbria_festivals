import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
from uuid import UUID, uuid4

from app.core.database import get_db
from app.core.config import settings
from app.models.festival import FestivalModel
from app.models.review import ReviewModel
from app.models.submission import SubmissionModel
from app.schemas.festival import FestivalResponse, FestivalCreate, FestivalUpdate
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewSummaryResponse
from app.schemas.submission import SubmissionCreate, SubmissionResponse

from app.core.geo import validate_and_fix_coordinates
from app.core.agent_writer import generate_organic_festival_description

router = APIRouter(prefix="/api/v1/festivals", tags=["festivals"])



def _get_rating_stats_map(db: Session):
    stats = db.query(
        ReviewModel.festival_id,
        func.avg(ReviewModel.rating).label("avg_rating"),
        func.count(ReviewModel.id).label("count")
    ).group_by(ReviewModel.festival_id).all()
    return {
        r.festival_id: (round(float(r.avg_rating), 1), int(r.count))
        for r in stats
    }


def _enrich_festival_response(festival: FestivalModel, stats_map: dict) -> FestivalResponse:
    resp = FestivalResponse.model_validate(festival)
    if festival.id in stats_map:
        avg_rating, count = stats_map[festival.id]
        resp.average_rating = avg_rating
        resp.review_count = count
    return resp


def _send_submission_notification(sub: SubmissionModel):
    subject = f"[Sagra Umbra] Nuova Segnalazione Sagra: {sub.festival_name} ({sub.city})"
    body = f"""
NUOVA SEGNALAZIONE / AGGIORNAMENTO SAGRA
-----------------------------------------
Ruolo Compilatore: {sub.submitter_role.upper()}
Nome Sagra: {sub.festival_name}
Comune: {sub.city} ({sub.province})
Date: {sub.start_date or 'N/D'} - {sub.end_date or 'N/D'}

CONTATTI REFERENTE:
Email: {sub.contact_email}
Telefono: {sub.contact_phone or 'N/D'}
Sito/Social: {sub.official_link or 'N/D'}

PROGRAMMA & CONCERTI GIORNO PER GIORNO:
{sub.program_info or 'Non specificato'}

MENÙ E GASTRONOMIA:
{sub.menu_info or 'Non specificato'}

DESCRIZIONE ED EVENTI:
{sub.description or 'Non specificata'}

NOTE AGGIUNTIVE / LOCANDINA:
{sub.additional_notes or 'Nessuna'}

Destinatario Email: {settings.TARGET_EMAIL}
Inviato tramite il portale Sagra Umbra.
    """
    if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_USER
            msg['To'] = settings.TARGET_EMAIL
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            print(f"Email inviata con successo a {settings.TARGET_EMAIL}")
        except Exception as e:
            print(f"Errore durante l'invio email SMTP: {e}")
    else:
        print(f"[REGISTRATO INVIO NOTIFICA EMAIL -> {settings.TARGET_EMAIL}]\n{subject}\n{body}")


@router.get("/", response_model=List[FestivalResponse])
def get_festivals(
    province: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(FestivalModel)
    if province:
        query = query.filter(FestivalModel.province == province)
    else:
        # Only return Umbria festivals (province PG or TR)
        query = query.filter(FestivalModel.province.in_(["PG", "TR"]))
        
    # Filter out festivals from previous years (keep 2025 and 2026+)
    query = query.filter(FestivalModel.start_date >= "2025-01-01")
    
    festivals = query.all()
    stats_map = _get_rating_stats_map(db)
    
    return [_enrich_festival_response(f, stats_map) for f in festivals]


@router.get("/{festival_id}", response_model=FestivalResponse)
def get_festival(festival_id: UUID, db: Session = Depends(get_db)):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")
    stats_map = _get_rating_stats_map(db)
    return _enrich_festival_response(festival, stats_map)


@router.post("/", response_model=FestivalResponse, status_code=201)
def create_festival(data: FestivalCreate, db: Session = Depends(get_db)):
    data_dict = data.model_dump()
    # Enforce geographic coordinate matching for the given city
    lat, lon, _ = validate_and_fix_coordinates(
        data_dict["city"], data_dict["province"], data_dict["latitude"], data_dict["longitude"], description=data_dict.get("description", "")
    )
    data_dict["latitude"] = lat
    data_dict["longitude"] = lon

    festival = FestivalModel(id=uuid4(), **data_dict)
    db.add(festival)
    db.commit()
    db.refresh(festival)
    return _enrich_festival_response(festival, {})


@router.put("/{festival_id}", response_model=FestivalResponse)
def update_festival(festival_id: UUID, data: FestivalUpdate, db: Session = Depends(get_db)):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")
    
    updates = data.model_dump(exclude_unset=True)
    city = updates.get("city", festival.city)
    province = updates.get("province", festival.province)
    lat = updates.get("latitude", festival.latitude)
    lon = updates.get("longitude", festival.longitude)
    desc = updates.get("description", festival.description or "")

    # Enforce geographic coordinate matching
    fixed_lat, fixed_lon, _ = validate_and_fix_coordinates(city, province, lat, lon, description=desc)
    updates["latitude"] = fixed_lat
    updates["longitude"] = fixed_lon


    for field, value in updates.items():
        setattr(festival, field, value)
    db.commit()
    db.refresh(festival)
    stats_map = _get_rating_stats_map(db)
    return _enrich_festival_response(festival, stats_map)


@router.post("/{festival_id}/poster", response_model=FestivalResponse)
async def upload_festival_poster(
    festival_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival non trovato")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]:
        ext = ".jpg"

    filename = f"poster_{festival_id}_{uuid4().hex[:8]}{ext}"
    os.makedirs("uploads/posters", exist_ok=True)
    file_path = os.path.join("uploads", "posters", filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    festival.image_url = f"/uploads/posters/{filename}"
    db.commit()
    db.refresh(festival)
    stats_map = _get_rating_stats_map(db)
    return _enrich_festival_response(festival, stats_map)


@router.delete("/{festival_id}", status_code=204)
def delete_festival(festival_id: UUID, db: Session = Depends(get_db)):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")
    db.delete(festival)
    db.commit()


# --- SUBMISSIONS FOR ORGANIZERS & USERS ---

@router.post("/submit-info", response_model=SubmissionResponse, status_code=201)
def submit_festival_info(submission_data: SubmissionCreate, db: Session = Depends(get_db)):
    submission = SubmissionModel(
        id=uuid4(),
        submitter_role=submission_data.submitter_role,
        festival_name=submission_data.festival_name.strip(),
        city=submission_data.city.strip(),
        province=submission_data.province.upper(),
        start_date=submission_data.start_date,
        end_date=submission_data.end_date,
        menu_info=submission_data.menu_info.strip() if submission_data.menu_info else None,
        program_info=submission_data.program_info.strip() if submission_data.program_info else None,
        description=submission_data.description.strip() if submission_data.description else None,
        contact_email=submission_data.contact_email.strip(),
        contact_phone=submission_data.contact_phone.strip() if submission_data.contact_phone else None,
        official_link=submission_data.official_link.strip() if submission_data.official_link else None,
        additional_notes=submission_data.additional_notes.strip() if submission_data.additional_notes else None,
        status="pending"
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Trigger email notification to sagraumbra@gmail.com
    _send_submission_notification(submission)

    return SubmissionResponse.model_validate(submission)


@router.get("/admin/submissions", response_model=List[SubmissionResponse])
def get_admin_submissions(db: Session = Depends(get_db)):
    submissions = db.query(SubmissionModel).order_by(SubmissionModel.created_at.desc()).all()
    return [SubmissionResponse.model_validate(s) for s in submissions]


# --- REVIEWS & FORK RATINGS ENDPOINTS ---

@router.get("/{festival_id}/reviews", response_model=ReviewSummaryResponse)
def get_festival_reviews(festival_id: UUID, db: Session = Depends(get_db)):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival non trovato")

    reviews = (
        db.query(ReviewModel)
        .filter(ReviewModel.festival_id == festival_id)
        .order_by(ReviewModel.created_at.desc())
        .all()
    )
    
    count = len(reviews)
    if count == 0:
        return ReviewSummaryResponse(
            average_rating=None,
            review_count=0,
            rating_breakdown={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            reviews=[]
        )

    avg_rating = round(sum(r.rating for r in reviews) / count, 1)
    breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in reviews:
        if 1 <= r.rating <= 5:
            breakdown[r.rating] += 1

    return ReviewSummaryResponse(
        average_rating=avg_rating,
        review_count=count,
        rating_breakdown=breakdown,
        reviews=[ReviewResponse.model_validate(r) for r in reviews]
    )


@router.post("/{festival_id}/reviews", response_model=ReviewResponse, status_code=201)
def add_festival_review(festival_id: UUID, review_data: ReviewCreate, db: Session = Depends(get_db)):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival non trovato")

    author = review_data.author_name.strip() if review_data.author_name and review_data.author_name.strip() else "Anonimo"

    review = ReviewModel(
        id=uuid4(),
        festival_id=festival_id,
        author_name=author,
        rating=review_data.rating,
        comment=review_data.comment.strip()
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return ReviewResponse.model_validate(review)


@router.get("/search/nearby", response_model=List[FestivalResponse])
def get_nearby_festivals(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(20.0, gt=0),
    db: Session = Depends(get_db)
):
    raw_query = text("""
        SELECT id, name, city, province, latitude, longitude, start_date, end_date, source_url, cultural_info, dish_info, image_url
        FROM festivals
        WHERE ST_DWithin(
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
            :radius
        )
    """)
    result = db.execute(
        raw_query,
        {"lat": latitude, "lon": longitude, "radius": radius_km * 1000}
    ).fetchall()
    return result


@router.post("/seed")
def seed_database():
    try:
        import sys
        sys.path.append("/app")
        from seed_agent_festivals import run_seed
        run_seed()
        return {"status": "success", "message": "Database seeded with AI Agent festival data."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix")
def fix_database():
    try:
        import sys
        sys.path.append("/app")
        from fix_festivals_data import run_corrections
        run_corrections()
        return {"status": "success", "message": "Database corrections applied (province, city, images, junk removed)."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix-residual")
def fix_residual_database():
    try:
        import sys, importlib.util
        sys.path.append("/app")
        spec = importlib.util.spec_from_file_location("fix_residual", "/app/fix_residual.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return {"status": "success", "message": "Residual corrections applied."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix-town-images")
def fix_town_images():
    try:
        import sys, importlib.util
        sys.path.append("/app")
        spec = importlib.util.spec_from_file_location("fix_authentic_covers", "/app/fix_authentic_covers.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.update_authentic_covers()
        return {"status": "success", "message": "Original event locandine restored and exact town aerial panoramas assigned."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix-coordinates")
def fix_coordinates_endpoint(db: Session = Depends(get_db)):
    """Verifica e corregge le coordinate di tutte le sagre nel database rendendole 100% coerenti con il borgo."""
    festivals = db.query(FestivalModel).all()
    corrected_count = 0
    for f in festivals:
        fixed_lat, fixed_lon, was_corrected = validate_and_fix_coordinates(
            f.city, f.province, f.latitude, f.longitude
        )
        if was_corrected or f.latitude != fixed_lat or f.longitude != fixed_lon:
            f.latitude = fixed_lat
            f.longitude = fixed_lon
            corrected_count += 1
    db.commit()
    return {
        "status": "success",
        "total_festivals": len(festivals),
        "corrected_festivals": corrected_count,
        "message": f"Allineate le coordinate geografiche di {corrected_count} sagre sulla mappa."
    }


@router.post("/fix-covers")
def fix_covers_endpoint():
    """Scrape and enrich authentic cover images for all festivals in the database."""
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        import fix_authentic_covers
        updated_count, details = fix_authentic_covers.fix_all_covers()
        return {
            "status": "success",
            "updated_count": updated_count,
            "message": f"Aggiornate e migliorate con successo {updated_count} copertine/locandine di sagre.",
            "details": details
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-description-preview")
def generate_description_preview_endpoint(payload: dict):
    """Genera una bozza di descrizione organica per un evento senza salvarla subito nel DB."""
    description = generate_organic_festival_description(
        name=payload.get("name", ""),
        city=payload.get("city", ""),
        province=payload.get("province", "PG"),
        dish_info=payload.get("dish_info"),
        cultural_info=payload.get("cultural_info"),
        menu_info=payload.get("menu_info"),
        program_info=payload.get("program_info")
    )
    return {"description": description}


@router.post("/{festival_id}/generate-description", response_model=FestivalResponse)
def generate_festival_description_endpoint(festival_id: UUID, db: Session = Depends(get_db)):
    """Lancia l'agente per generare una descrizione organica personalizzata per una sagra specifica."""
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival non trovato")

    festival.description = generate_organic_festival_description(
        name=festival.name,
        city=festival.city,
        province=festival.province,
        dish_info=festival.dish_info,
        cultural_info=festival.cultural_info,
        menu_info=festival.menu_info,
        program_info=festival.program_info
    )
    db.commit()
    db.refresh(festival)
    stats_map = _get_rating_stats_map(db)
    return _enrich_festival_response(festival, stats_map)


@router.post("/bulk-generate-descriptions")
def bulk_generate_descriptions_endpoint(db: Session = Depends(get_db)):
    """Genera descrizioni organiche per tutte le sagre che ne sono sprovviste o hanno testi brevi."""
    festivals = db.query(FestivalModel).all()
    updated_count = 0
    for f in festivals:
        if not f.description or len(f.description.strip()) < 50 or f.description.startswith("Manifestazioni"):
            f.description = generate_organic_festival_description(
                name=f.name,
                city=f.city,
                province=f.province,
                dish_info=f.dish_info,
                cultural_info=f.cultural_info,
                menu_info=f.menu_info,
                program_info=f.program_info
            )
            updated_count += 1
    db.commit()
    return {
        "status": "success",
        "updated_count": updated_count,
        "message": f"Generate ed arricchite con successo descrizioni organiche per {updated_count} sagre."
    }