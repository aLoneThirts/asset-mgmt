from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    APP_ENV: str = "development"

    # Firebase — JSON string (Render env var olarak sakla)
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
