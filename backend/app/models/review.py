import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class ReviewModel(Base):
    __tablename__ = 'reviews'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    festival_id = Column(UUID(as_uuid=True), ForeignKey('festivals.id', ondelete='CASCADE'), nullable=False, index=True)
    author_name = Column(String, nullable=False, default='Anonimo')
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    festival = relationship('FestivalModel', back_populates='reviews')
