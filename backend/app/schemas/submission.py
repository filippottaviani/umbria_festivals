from datetime import datetime
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

class SubmissionCreate(BaseModel):
    submitter_role: str = Field("gestore", description="gestore, pro_loco, utente")
    festival_name: str = Field(..., min_length=2, max_length=150)
    city: str = Field(..., min_length=2, max_length=100)
    province: str = Field("PG", min_length=2, max_length=2)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    menu_info: Optional[str] = None
    program_info: Optional[str] = Field(None, description="Programma e concerti giorno per giorno")
    description: Optional[str] = None
    contact_email: str = Field(..., description="Email del referente")
    contact_phone: Optional[str] = None
    official_link: Optional[str] = None
    additional_notes: Optional[str] = None

class SubmissionResponse(BaseModel):
    id: UUID
    submitter_role: str
    festival_name: str
    city: str
    province: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    menu_info: Optional[str] = None
    program_info: Optional[str] = None
    description: Optional[str] = None
    contact_email: str
    contact_phone: Optional[str] = None
    official_link: Optional[str] = None
    additional_notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
