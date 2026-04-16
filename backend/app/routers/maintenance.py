from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.core.firebase import get_db
from app.models.maintenance import MaintenanceCreate, MaintenanceUpdate
from app.services.log_service import add_log

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("/")
async def list_records(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("maintenance").order_by("date", direction="DESCENDING").stream()
    result = []
    async for doc in docs:
        result.append({"id": doc.id, **doc.to_dict()})
    return result


@router.post("/", status_code=201)
async def create_record(payload: MaintenanceCreate, user: dict = Depends(get_current_user)):
    db = get_db()

    # Demirbaş adını al
    asset_doc = await db.collection("assets").document(payload.asset_id).get()
    asset_name = asset_doc.to_dict().get("name", payload.asset_id) if asset_doc.exists else payload.asset_id

    data = {
        "asset_id": payload.asset_id,
        "asset_name": asset_name,
        "description": payload.description,
        "reported_by": user["uid"],
        "reported_by_email": user.get("email", ""),
        "date": datetime.now(timezone.utc).isoformat(),
        "status": "Açık",
    }
    ref = await db.collection("maintenance").add(data)
    doc_id = ref[1].id

    # Demirbaş durumunu "Arızalı" yap
    if asset_doc.exists:
        await db.collection("assets").document(payload.asset_id).update({"status": "Arızalı"})

    await add_log(db, user.get("email", ""), "arıza_kaydı_açıldı", f"{asset_name}: {payload.description}")
    return {"id": doc_id, **data}


@router.put("/{record_id}")
async def update_record(
    record_id: str,
    payload: MaintenanceUpdate,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    ref = db.collection("maintenance").document(record_id)
    doc = await ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    await ref.update(update_data)

    # Arıza çözüldüyse demirbaş durumunu "Aktif" yap
    if payload.status == "Çözüldü":
        asset_id = doc.to_dict().get("asset_id")
        if asset_id:
            await db.collection("assets").document(asset_id).update({"status": "Aktif"})

    await add_log(db, user.get("email", ""), "arıza_güncellendi", f"ID: {record_id} → {payload.status}")
    return {"id": record_id, **doc.to_dict(), **update_data}
