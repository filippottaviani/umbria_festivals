from typing import Generator, Optional
from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_admin_api_key(x_admin_api_key: Optional[str] = Header(None)) -> str:
    """Verifica che l'header X-Admin-API-Key corrisponda alla chiave di amministrazione configurata."""
    if not x_admin_api_key or x_admin_api_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Accesso non autorizzato: API Key di amministrazione non valida o mancante."
        )
    return x_admin_api_key