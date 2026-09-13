from sqlalchemy import Column, String, Text
from app.core.database import Base

class CityInfoModel(Base):
    __tablename__ = 'cities_info'

    name = Column(String, primary_key=True, index=True)
    province = Column(String, nullable=True)
    wiki_summary = Column(Text, nullable=True)
    wiki_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default='PENDING') # 'VERIFIED', 'AMBIGUOUS', 'NOT_FOUND', 'PENDING'
