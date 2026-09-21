from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/umbriafestivals"
    PROJECT_NAME: str = "Sagra Umbra API"
    TARGET_EMAIL: str = "sagraumbra@gmail.com"
    ADMIN_API_KEY: str = "sagra_umbra_admin_secret_key_2026"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://sagraumbra.it"

    # Optional SMTP configuration
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()