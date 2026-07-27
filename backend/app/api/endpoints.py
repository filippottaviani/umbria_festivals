from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID, uuid4
from app.core.database import get_db
from app.models.festival import FestivalModel
from app.schemas.festival import FestivalResponse, FestivalCreate, FestivalUpdate

router = APIRouter(prefix="/api/v1/festivals", tags=["festivals"])

from datetime import datetime
from sqlalchemy import extract

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
    
    return query.all()

@router.get("/{festival_id}", response_model=FestivalResponse)
def get_festival(festival_id: UUID, db: Session = Depends(get_db)):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")
    return festival

@router.post("/", response_model=FestivalResponse, status_code=201)
def create_festival(data: FestivalCreate, db: Session = Depends(get_db)):
    festival = FestivalModel(id=uuid4(), **data.model_dump())
    db.add(festival)
    db.commit()
    db.refresh(festival)
    return festival

@router.put("/{festival_id}", response_model=FestivalResponse)
def update_festival(festival_id: UUID, data: FestivalUpdate, db: Session = Depends(get_db)):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(festival, field, value)
    db.commit()
    db.refresh(festival)
    return festival

@router.delete("/{festival_id}", status_code=204)
def delete_festival(festival_id: UUID, db: Session = Depends(get_db)):
    festival = db.query(FestivalModel).filter(FestivalModel.id == festival_id).first()
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")
    db.delete(festival)
    db.commit()

@router.get("/search/nearby", response_model=List[FestivalResponse])
def get_nearby_festivals(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(20.0, gt=0),
    db: Session = Depends(get_db)
):
    # Using the ORM directly for a simple query to keep all fields populated,
    # or updating the raw query to include new fields.
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

