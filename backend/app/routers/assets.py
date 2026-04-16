from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.core.firebase import get_db
from app.models.asset import AssetCreate, AssetUpdate
from app.services.log_service import add_log

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/")
async def list_assets(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("assets").stream()
    result = []
    async for doc in docs:
        result.append({"id": doc.id, **doc.to_dict()})
    return result


@router.get("/{asset_id}")
async def get_asset(asset_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.collection("assets").document(asset_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Demirbaş bulunamadı.")
    return {"id": doc.id, **doc.to_dict()}


@router.post("/", status_code=201)
async def create_asset(payload: AssetCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    data = {
        **payload.model_dump(),
        "location": "Genel Merkez",
        "added_at": datetime.now(timezone.utc).isoformat(),
        "imported_by": user.get("email", ""),
    }
    ref = await db.collection("assets").add(data)
    doc_id = ref[1].id
    await add_log(db, user.get("email", ""), "demirbaş_eklendi", f"{payload.name} eklendi.")
    return {"id": doc_id, **data}


@router.put("/{asset_id}")
async def update_asset(
    asset_id: str,
    payload: AssetUpdate,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    ref = db.collection("assets").document(asset_id)
    doc = await ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Demirbaş bulunamadı.")
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    await ref.update(update_data)
    await add_log(db, user.get("email", ""), "demirbaş_güncellendi", f"ID: {asset_id}")
    return {"id": asset_id, **doc.to_dict(), **update_data}


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(asset_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    ref = db.collection("assets").document(asset_id)
    doc = await ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Demirbaş bulunamadı.")
    name = doc.to_dict().get("name", asset_id)
    await ref.delete()
    await add_log(db, user.get("email", ""), "demirbaş_silindi", f"{name} silindi.")
