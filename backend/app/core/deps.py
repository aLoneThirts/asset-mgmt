from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.firebase import verify_token

bearer_scheme = HTTPBearer()


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Authorization: Bearer <firebase_id_token> header'ını doğrular.
    Decoded token claims döndürür: uid, email, name vs.
    """
    try:
        claims = verify_token(creds.credentials)
        return claims
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz veya süresi dolmuş oturum.",
        )
