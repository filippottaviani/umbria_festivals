import uuid
from sqlalchemy import Column, String, Date, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

from sqlalchemy.orm import relationship

class FestivalModel(Base):
    __tablename__ = 'festivals'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    province = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    source_url = Column(String, unique=True, nullable=False)
    cultural_info = Column(Text, nullable=True)
    dish_info = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    menu_info = Column(Text, nullable=True)

    reviews = relationship('ReviewModel', back_populates='festival', cascade='all, delete-orphan')
