from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.core.database import get_db
from app.models.festival import FestivalModel
from app.schemas.festival import FestivalResponse

router = APIRouter(prefix="/api/v1/festivals", tags=["festivals"])

@router.get("/", response_model=List[FestivalResponse])
def get_festivals(
    province: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(FestivalModel)
    if province:
        query = query.filter(FestivalModel.province == province)
    return query.all()

@router.get("/nearby", response_model=List[FestivalResponse])
def get_nearby_festivals(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(20.0, gt=0),
    db: Session = Depends(get_db)
):
    raw_query = text("""
        SELECT id, name, city, province, latitude, longitude, start_date, end_date, source_url
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