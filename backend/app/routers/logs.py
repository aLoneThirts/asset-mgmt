from fastapi import APIRouter, Depends
from app.core.deps import get_current_user
from app.core.firebase import get_db

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/")
async def list_logs(limit: int = 100, user: dict = Depends(get_current_user)):
    db = get_db()
    docs = (
        db.collection("logs")
        .order_by("date", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    result = []
    async for doc in docs:
        result.append({"id": doc.id, **doc.to_dict()})
    return result
