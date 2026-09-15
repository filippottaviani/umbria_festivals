from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime
from app.core.database import Base

class GeocodeCacheModel(Base):
    __tablename__ = 'geocode_cache'

    query = Column(String, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    resolved_name = Column(String, nullable=True)
    source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
