from datetime import datetime, timezone
from google.cloud.firestore import AsyncClient


async def add_log(
    db: AsyncClient,
    user_email: str,
    action: str,
    detail: str,
) -> None:
    """Firestore logs koleksiyonuna yeni kayıt ekle."""
    await db.collection("logs").add({
        "user": user_email,
        "action": action,
        "detail": detail,
        "date": datetime.now(timezone.utc).isoformat(),
    })
