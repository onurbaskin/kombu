from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables and `.env`."""

    app_name: str = "Kombu"
    environment: str = "development"
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"
    public_web_url: str = "http://localhost:5173"
    database_url: str = "sqlite:///./var/kombu.db"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
        ],
    )
    ai_features_enabled: bool = False
    scanner_upload_dir: str = "var/scans"
    recipe_import_dir: str = "var/imports"
    kaggle_username: str = ""
    kaggle_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="KOMBU_",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: object) -> object:
        """Allow CORS origins to be configured as a comma-separated string."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
