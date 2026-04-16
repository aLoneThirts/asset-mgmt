from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

try:
    from backend.app.core.firebase_admin import get_firebase_app
except ModuleNotFoundError:
    from app.core.firebase_admin import get_firebase_app

bearer_scheme = HTTPBearer(auto_error=True)


@dataclass
class AuthUser:
    uid: str
    email: str
    name: str | None = None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthUser:
    get_firebase_app()

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
    )
