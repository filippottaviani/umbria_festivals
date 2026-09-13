from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/umbriafestivals"
    PROJECT_NAME: str = "Sagra Umbra API"
    TARGET_EMAIL: str = "sagraumbra@gmail.com"

    # Optional SMTP configuration
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()