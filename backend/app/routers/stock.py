from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user
from app.core.firebase import get_db
from app.models.stock import StockCreate, StockUpdate
from app.services.log_service import add_log

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("/")
async def list_stock(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("stock").stream()
    result = []
    async for doc in docs:
        item = {"id": doc.id, **doc.to_dict()}
        item["low_stock"] = item.get("quantity", 0) <= item.get("min_quantity", 5)
        result.append(item)
    return result


@router.post("/", status_code=201)
async def create_stock(payload: StockCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    data = {
        **payload.model_dump(),
        "low_stock": payload.quantity <= payload.min_quantity,
    }
    ref = await db.collection("stock").add(data)
    doc_id = ref[1].id
    await add_log(db, user.get("email", ""), "stok_eklendi", f"{payload.name} eklendi. Miktar: {payload.quantity}")
    return {"id": doc_id, **data}


@router.put("/{item_id}")
async def update_stock(
    item_id: str,
    payload: StockUpdate,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    ref = db.collection("stock").document(item_id)
    doc = await ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Stok kalemi bulunamadı.")

    current = doc.to_dict()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}

    qty = update_data.get("quantity", current.get("quantity", 0))
    min_qty = update_data.get("min_quantity", current.get("min_quantity", 5))
    update_data["low_stock"] = qty <= min_qty

    await ref.update(update_data)
    await add_log(db, user.get("email", ""), "stok_güncellendi", f"ID: {item_id}")
    return {"id": item_id, **current, **update_data}


@router.delete("/{item_id}", status_code=204)
async def delete_stock(item_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    ref = db.collection("stock").document(item_id)
    if not (await ref.get()).exists:
        raise HTTPException(status_code=404, detail="Stok kalemi bulunamadı.")
    await ref.delete()
    await add_log(db, user.get("email", ""), "stok_silindi", f"ID: {item_id}")
