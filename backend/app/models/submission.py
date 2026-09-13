import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class SubmissionModel(Base):
    __tablename__ = 'submissions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submitter_role = Column(String, nullable=False, default='gestore')
    festival_name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    province = Column(String, nullable=False, default='PG')
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    menu_info = Column(Text, nullable=True)
    program_info = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    contact_email = Column(String, nullable=False)
    contact_phone = Column(String, nullable=True)
    official_link = Column(String, nullable=True)
    additional_notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default='pending')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
