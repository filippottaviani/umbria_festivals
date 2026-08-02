from datetime import date
from uuid import UUID
from typing import Optional
from pydantic import BaseModel

class FestivalBase(BaseModel):
    name: str
    city: str
    province: str
    latitude: float
    longitude: float
    start_date: date
    end_date: date
    source_url: str
    cultural_info: Optional[str] = None
    dish_info: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    menu_info: Optional[str] = None
    program_info: Optional[str] = None

class FestivalCreate(FestivalBase):
    pass

class FestivalUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    source_url: Optional[str] = None
    cultural_info: Optional[str] = None
    dish_info: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    menu_info: Optional[str] = None
    program_info: Optional[str] = None

class FestivalResponse(FestivalBase):
    id: UUID
    average_rating: Optional[float] = None
    review_count: int = 0

    class Config:
        from_attributes = True
