from __future__ import annotations

import firebase_admin
from firebase_admin import credentials, firestore

try:
    from backend.app.core.config import get_settings
except ModuleNotFoundError:
    from app.core.config import get_settings


def get_firebase_app() -> firebase_admin.App:
    settings = get_settings()

    if firebase_admin._apps:
        return firebase_admin.get_app()

    app_options: dict[str, str] = {}
    if settings.firebase_project_id:
        app_options["projectId"] = settings.firebase_project_id
    if settings.firebase_storage_bucket:
        app_options["storageBucket"] = settings.firebase_storage_bucket

    if settings.firebase_project_id and settings.firebase_client_email and settings.firebase_private_key:
        certificate = credentials.Certificate(
            {
                "type": "service_account",
                "project_id": settings.firebase_project_id,
                "private_key_id": settings.firebase_private_key_id,
                "client_email": settings.firebase_client_email,
                "client_id": settings.firebase_client_id,
                "private_key": settings.firebase_private_key.strip().replace("\\n", "\n"),
                "auth_uri": settings.firebase_auth_uri,
                "token_uri": settings.firebase_token_uri,
                "auth_provider_x509_cert_url": settings.firebase_auth_provider_cert_url,
                "client_x509_cert_url": settings.firebase_client_cert_url,
                "universe_domain": settings.firebase_universe_domain,
            }
        )
        return firebase_admin.initialize_app(certificate, app_options)

    return firebase_admin.initialize_app(options=app_options)


def get_firestore_client() -> firestore.Client:
    app = get_firebase_app()
    return firestore.client(app=app)
