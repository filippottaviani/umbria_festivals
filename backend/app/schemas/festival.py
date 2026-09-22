from datetime import date
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, field_validator

class FestivalBase(BaseModel):
    name: str
    city: str
    province: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: date
    end_date: date
    source_url: str
    cultural_info: Optional[str] = None
    dish_info: Optional[str] = None
    dish_image_url: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    menu_info: Optional[str] = None
    program_info: Optional[str] = None
    is_verified_dates: Optional[str] = "VERIFIED"
    verification_source: Optional[str] = None
    date_notes: Optional[str] = None
    content_verified: Optional[bool] = False
    peer_review_score: Optional[int] = 100

    @field_validator('menu_info', mode='before')
    @classmethod
    def sanitize_menu(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v_lower = v.lower()
            if 'diritti riservati' in v_lower or 'part. iva' in v_lower or '©' in v_lower:
                return None
        return v

    @field_validator('cultural_info', 'dish_info', 'description', mode='before')
    @classmethod
    def sanitize_generic_text(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v_lower = v.lower()
            # Canned cultural templates
            if 'affascinante borgo dell' in v_lower and 'immerso nelle colline' in v_lower:
                return None
            if 'tempo sembra scorrere a una velocit' in v_lower or 'tempo sembra essersi fermato' in v_lower:
                return None
            if 'incantevole borgo dell\'umbria' in v_lower and 'tradizioni millenarie' in v_lower:
                return None
            if 'affascinante borgo umbro situato nella provincia' in v_lower and 'cuore più autentico' in v_lower:
                return None
            # Canned dish templates
            if 'cuochi ed i volontari' in v_lower and 'preparano per l\'occasione' in v_lower:
                return None
            # Canned event description templates
            if 'appuntamento simbolo del calendario estivo' in v_lower:
                return None
            if 'manifestazione ricca di fascino e tradizione' in v_lower:
                return None
            if 'momento di ritrovo festoso per celebrare' in v_lower:
                return None
            if 'unisce generazioni di paesani' in v_lower:
                return None
            if 'numerosi gli appuntamenti in programma' in v_lower:
                return None
            if 'un fantastico evento enogastronomico per riscoprire' in v_lower:
                return None
            if 'vuoi promuovere la tua sagra o evento' in v_lower:
                return None
            if 'trova la tua sagra preferita' in v_lower and 'p.iva' in v_lower:
                return None
        return v

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
    dish_image_url: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    menu_info: Optional[str] = None
    program_info: Optional[str] = None
    is_verified_dates: Optional[str] = None
    verification_source: Optional[str] = None
    date_notes: Optional[str] = None
    content_verified: Optional[bool] = None
    peer_review_score: Optional[int] = None

from app.schemas.city import CityInfoResponse

class FestivalResponse(FestivalBase):
    id: UUID
    average_rating: Optional[float] = None
    review_count: int = 0
    city_info: Optional[CityInfoResponse] = None

    class Config:
        from_attributes = True
