from functools import lru_cache

from pydantic import Field
from pydantic import ValidationInfo
from pydantic import field_validator
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
    bootstrap_admin_email: str = Field(default="goktugfuaty@gmail.com", alias="BOOTSTRAP_ADMIN_EMAIL")
    database_url: str | None = Field(default=None, alias="DATABASE_URL")

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

    @field_validator(
        "app_env",
        "frontend_origin",
        "bootstrap_admin_email",
        "database_url",
        "firebase_project_id",
        "firebase_private_key_id",
        "firebase_client_email",
        "firebase_client_id",
        "firebase_private_key",
        "firebase_auth_uri",
        "firebase_token_uri",
        "firebase_auth_provider_cert_url",
        "firebase_client_cert_url",
        "firebase_universe_domain",
        "firebase_storage_bucket",
        mode="before",
    )
    @classmethod
    def strip_string_fields(cls, value: str | None, info: ValidationInfo) -> str | None:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None

            # Vercel/Firebase env imports may accidentally contain escaped CRLF suffixes ("\r\n").
            # Normalize them so bucket/project/url values remain valid in runtime.
            if info.field_name == "firebase_private_key":
                value = value.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\r\n", "\n").replace("\r", "\n")
                return value.strip() or None

            value = value.replace("\\r\\n", "").replace("\\n", "").replace("\\r", "")
            return value.strip() or None
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
