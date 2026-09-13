from typing import Optional
from pydantic import BaseModel

class CityInfoBase(BaseModel):
    name: str
    province: Optional[str] = None
    wiki_summary: Optional[str] = None
    wiki_url: Optional[str] = None
    status: str

class CityInfoUpdate(BaseModel):
    wiki_summary: Optional[str] = None
    wiki_url: Optional[str] = None

class CityInfoResponse(CityInfoBase):
    class Config:
        from_attributes = True
