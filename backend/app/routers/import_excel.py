import io
import uuid
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.deps import get_current_user
from app.core.firebase import get_db
from app.services.log_service import add_log

router = APIRouter(prefix="/import", tags=["import"])

# Lighthouse Excel sütun adı → iç alan adı eşlemesi
COLUMN_MAP = {
    "demirbaş id": "id",
    "ürün adı": "name",
    "seri no": "serial_no",
    "kategori": "category",
    "marka": "brand",
    "model": "model",
    "durum": "status",
    "lokasyon": "location",
    "eklenme tarihi": "added_at",
}


@router.post("/excel")
async def import_excel(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Sadece .xlsx veya .xls dosyası yükleyebilirsiniz.")

    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Excel dosyası okunamadı.")

    # Sütun adlarını normalize et (küçük harf, baştaki/sondaki boşluk temizle)
    df.columns = [str(c).strip().lower() for c in df.columns]

    # Kolon eşlemesini uygula
    df = df.rename(columns=COLUMN_MAP)

    # Zorunlu alan kontrolü
    if "name" not in df.columns:
        raise HTTPException(status_code=400, detail="Excel'de 'Ürün Adı' sütunu bulunamadı.")

    db = get_db()
    batch = db.batch()
    imported = 0

    for _, row in df.iterrows():
        name = str(row.get("name", "")).strip()
        if not name or name.lower() == "nan":
            continue

        doc_id = str(row.get("id", "")).strip()
        if not doc_id or doc_id.lower() == "nan":
            doc_id = str(uuid.uuid4())[:8].upper()

        data = {
            "name": name,
            "serial_no": _val(row, "serial_no"),
            "category": _val(row, "category"),
            "brand": _val(row, "brand"),
            "model": _val(row, "model"),
            "status": _val(row, "status") or "Aktif",
            "location": "Genel Merkez",
            "added_at": _val(row, "added_at") or datetime.now(timezone.utc).isoformat(),
            "imported_by": user.get("email", ""),
        }

        ref = db.collection("assets").document(doc_id)
        batch.set(ref, data, merge=True)
        imported += 1

        if imported % 400 == 0:
            await batch.commit()
            batch = db.batch()

    if imported % 400 != 0:
        await batch.commit()

    await add_log(
        db,
        user.get("email", ""),
        "excel_import",
        f"{file.filename} dosyasından {imported} kayıt aktarıldı.",
    )

    return {"imported": imported, "message": f"{imported} demirbaş başarıyla aktarıldı."}


def _val(row, key: str) -> str | None:
    v = row.get(key)
    if v is None:
        return None
    s = str(v).strip()
    return None if s.lower() in ("nan", "", "none") else s
