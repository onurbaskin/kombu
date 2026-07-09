from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables and `.env`."""

    app_name: str = "Kombu"
    environment: str = "development"
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"
    public_web_url: str = "http://localhost:5173"
    database_url: str = "sqlite:///./var/kombu.db"
    cors_origins: str = (
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    )
    ai_features_enabled: bool = False
    scanner_upload_dir: str = "var/scans"
    recipe_import_dir: str = "var/imports"
    encryption_key: str = ""
    kaggle_username: str = Field(default="", alias="KAGGLE_USERNAME")
    kaggle_key: str = Field(default="", alias="KAGGLE_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="KOMBU_",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        """Parsed CORS origins list."""
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
