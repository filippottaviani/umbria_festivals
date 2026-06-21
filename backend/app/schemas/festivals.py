from pydantic import BaseModel, HttpUrl
from datetime import date
from uuid import UUID

class FestivalBase(BaseModel):
    name: str
    city: str
    province: str
    latitude: float
    longitude: float
    start_date: date
    end_date: date
    source_url: HttpUrl

class FestivalCreate(FestivalBase):
    pass

class FestivalResponse(FestivalBase):
    id: UUID

    class Config:
        from_attributes = True