from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Asset Management API"
    app_env: str = Field(default="development", alias="APP_ENV")
    frontend_origin: str = Field(default="http://localhost:5173", alias="FRONTEND_ORIGIN")

    firebase_project_id: str | None = Field(default=None, alias="FIREBASE_PROJECT_ID")
    firebase_private_key_id: str | None = Field(default=None, alias="FIREBASE_PRIVATE_KEY_ID")
    firebase_client_email: str | None = Field(default=None, alias="FIREBASE_CLIENT_EMAIL")
    firebase_client_id: str | None = Field(default=None, alias="FIREBASE_CLIENT_ID")
    firebase_private_key: str | None = Field(default=None, alias="FIREBASE_PRIVATE_KEY")
    firebase_auth_uri: str | None = Field(default=None, alias="FIREBASE_AUTH_URI")
    firebase_token_uri: str | None = Field(default=None, alias="FIREBASE_TOKEN_URI")
    firebase_auth_provider_cert_url: str | None = Field(
        default=None,
        alias="FIREBASE_AUTH_PROVIDER_X509_CERT_URL",
    )
    firebase_client_cert_url: str | None = Field(
        default=None,
        alias="FIREBASE_CLIENT_X509_CERT_URL",
    )
    firebase_universe_domain: str | None = Field(default=None, alias="FIREBASE_UNIVERSE_DOMAIN")
    firebase_storage_bucket: str | None = Field(default=None, alias="FIREBASE_STORAGE_BUCKET")


@lru_cache
def get_settings() -> Settings:
    return Settings()
