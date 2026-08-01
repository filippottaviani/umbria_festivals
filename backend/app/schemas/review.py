from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class ReviewCreate(BaseModel):
    author_name: Optional[str] = Field("Anonimo", max_length=100)
    rating: int = Field(..., ge=1, le=5, description="Voto espresso in forchette da 1 a 5")
    comment: str = Field(..., min_length=2, max_length=2000, description="Testo della recensione")

class ReviewResponse(BaseModel):
    id: UUID
    festival_id: UUID
    author_name: str
    rating: int
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewSummaryResponse(BaseModel):
    average_rating: Optional[float] = None
    review_count: int = 0
    rating_breakdown: Dict[int, int] = Field(default_factory=lambda: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0})
    reviews: List[ReviewResponse] = []
