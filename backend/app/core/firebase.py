import json
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
from app.config import get_settings

_db = None


def _load_credentials() -> dict | None:
    raw = get_settings().FIREBASE_SERVICE_ACCOUNT_JSON
    if not raw:
        return None

    # 1. Normal parse
    try:
        sa = json.loads(raw)
    except json.JSONDecodeError:
        # 2. Literal control character'lara izin ver
        try:
            sa = json.loads(raw, strict=False)
        except json.JSONDecodeError:
            # 3. \\n → \n düzelt
            sa = json.loads(raw.replace("\\n", "\n"), strict=False)

    # Private key içindeki escaped newline'ları gerçek newline'a çevir
    pk = sa.get("private_key", "")
    if "\\n" in pk:
        sa["private_key"] = pk.replace("\\n", "\n")

    return sa


def init_firebase() -> None:
    if firebase_admin._apps:
        return

    sa = _load_credentials()
    if sa:
        cred = credentials.Certificate(sa)
        firebase_admin.initialize_app(cred)
    else:
        # Geliştirme: uygulama credentials olmadan başlar (emülatör için)
        if get_settings().is_production:
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON env var set edilmemiş."
            )
        firebase_admin.initialize_app()


def get_db() -> firestore.AsyncClient:
    global _db
    if _db is None:
        _db = firestore.AsyncClient()
    return _db


def verify_token(id_token: str) -> dict:
    """Firebase ID token doğrula, decoded claims döndür."""
    return firebase_auth.verify_id_token(id_token)
