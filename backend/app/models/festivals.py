from sqlalchemy import Column, String, Date, Float
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.core.database import Base

class FestivalModel(Base):
    __tablename__ = "festivals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    province = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    source_url = Column(String, unique=True, nullable=False)