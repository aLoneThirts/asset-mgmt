from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

try:
    from backend.app.core.config import get_settings
    from backend.app.core.firebase_admin import get_firebase_app
except ModuleNotFoundError:
    from app.core.config import get_settings
    from app.core.firebase_admin import get_firebase_app

bearer_scheme = HTTPBearer(auto_error=True)


@dataclass
class AuthUser:
    uid: str
    email: str
    name: str | None = None
    is_admin: bool = False


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthUser:
    get_firebase_app()
    settings = get_settings()

    token = credentials.credentials
    try:
        decoded = auth.verify_id_token(token)
    except Exception as exc:  # pragma: no cover - Firebase runtime errors vary
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from exc

    email = decoded.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user e-mail is missing.",
        )

    return AuthUser(
        uid=decoded["uid"],
        email=email,
        name=decoded.get("name"),
        is_admin=bool(decoded.get("admin")) or email.lower() == settings.bootstrap_admin_email.lower(),
    )


def require_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu islem icin admin yetkisi gerekiyor.",
        )
    return user
