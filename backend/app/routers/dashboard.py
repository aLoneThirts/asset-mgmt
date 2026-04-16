from fastapi import APIRouter, Depends
from app.core.deps import get_current_user
from app.core.firebase import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
async def get_dashboard(user: dict = Depends(get_current_user)):
    db = get_db()

    # Demirbaşlar
    assets_docs = db.collection("assets").stream()
    total_assets = 0
    broken_assets = 0
    async for doc in assets_docs:
        total_assets += 1
        if doc.to_dict().get("status") == "Arızalı":
            broken_assets += 1

    # Açık arıza kayıtları
    maint_docs = db.collection("maintenance").where("status", "in", ["Açık", "Devam Ediyor"]).stream()
    open_maintenance = 0
    async for _ in maint_docs:
        open_maintenance += 1

    # Kritik stok
    stock_docs = db.collection("stock").where("low_stock", "==", True).stream()
    low_stock_items = []
    async for doc in stock_docs:
        low_stock_items.append({"id": doc.id, **doc.to_dict()})

    # Son 10 log
    log_docs = db.collection("logs").order_by("date", direction="DESCENDING").limit(10).stream()
    recent_logs = []
    async for doc in log_docs:
        recent_logs.append({"id": doc.id, **doc.to_dict()})

    return {
        "total_assets": total_assets,
        "broken_assets": broken_assets,
        "open_maintenance": open_maintenance,
        "low_stock_count": len(low_stock_items),
        "low_stock_items": low_stock_items,
        "recent_logs": recent_logs,
    }
