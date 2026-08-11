"""Application settings loaded from environment variables / .env.

Centralizing config here (per architecture.md's `core/` layer) means secrets
and tunables never get hard-coded in route or service files.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "jobpilot_ai"

    # Auth / JWT
    jwt_secret_key: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15

    # CORS (JSON array in the env var, e.g. CORS_ORIGINS=["http://localhost:5173"])
    cors_origins: List[str] = ["http://localhost:5173"]

    # Materials (Feature 4) -- Cloudinary free tier, no card required.
    # Leave blank until you've created a Cloudinary account; uploads will
    # fail with a clear error until these are set.
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
