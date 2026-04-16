from fastapi import APIRouter, Depends
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    """Token geçerliyse kullanıcı bilgisini döndür."""
    return {
        "uid": user["uid"],
        "email": user.get("email", ""),
        "name": user.get("name", user.get("email", "")),
    }
