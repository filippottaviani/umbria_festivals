from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
from uuid import UUID, uuid4
from app.core.database import get_db
from app.models.festival import FestivalModel
from app.models.review import ReviewModel
from app.schemas.festival import FestivalResponse, FestivalCreate, FestivalUpdate
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewSummaryResponse

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
    festival = FestivalModel(id=uuid4(), **data.model_dump())
    db.add(festival)
    db.commit()
    db.refresh(festival)
    return _enrich_festival_response(festival, {})


@router.put("/{festival_id}", response_model=FestivalResponse)
def update_festival(festival_id: UUID, data: FestivalUpdate, db: Session = Depends(get_db)):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(festival, field, value)
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