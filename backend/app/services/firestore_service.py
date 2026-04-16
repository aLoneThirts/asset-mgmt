from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from datetime import UTC, datetime
from io import BytesIO, StringIO
import csv
import math
import re
from typing import Any

import pandas as pd
from firebase_admin import firestore

try:
    from backend.app.core.firebase_admin import get_firestore_client
    from backend.app.models.schemas import (
        Asset,
        AssetCreate,
        AssetUpdate,
        AssignmentCreate,
        AssignmentRecord,
        AssignmentReturn,
        ChartDatum,
        DashboardSummary,
        ImportResult,
        LogEntry,
        MaintenanceCreate,
        MaintenanceRecord,
        MaintenanceUpdate,
        NotificationItem,
        Personnel,
        PersonnelCreate,
        PersonnelUpdate,
        ReportSummary,
        StockCreate,
        StockItem,
        StockUpdate,
        TrendDatum,
    )
except ModuleNotFoundError:
    from app.core.firebase_admin import get_firestore_client
    from app.models.schemas import (
        Asset,
        AssetCreate,
        AssetUpdate,
        AssignmentCreate,
        AssignmentRecord,
        AssignmentReturn,
        ChartDatum,
        DashboardSummary,
        ImportResult,
        LogEntry,
        MaintenanceCreate,
        MaintenanceRecord,
        MaintenanceUpdate,
        NotificationItem,
        Personnel,
        PersonnelCreate,
        PersonnelUpdate,
        ReportSummary,
        StockCreate,
        StockItem,
        StockUpdate,
        TrendDatum,
    )


ASSETS = "assets"
MAINTENANCE = "maintenance"
STOCK = "stock"
LOGS = "logs"
PERSONNEL = "personnel"
ASSIGNMENTS = "assignments"


def now_utc() -> datetime:
    return datetime.now(UTC)


def normalize_text(value: Any) -> str:
    text = str(value or "").strip()
    replacements = (
        ("\u00e7", "c"),
        ("\u00c7", "c"),
        ("\u011f", "g"),
        ("\u011e", "g"),
        ("\u0131", "i"),
        ("\u0130", "i"),
        ("\u00f6", "o"),
        ("\u00d6", "o"),
        ("\u015f", "s"),
        ("\u015e", "s"),
        ("\u00fc", "u"),
        ("\u00dc", "u"),
    )
    for source, target in replacements:
        text = text.replace(source, target)
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def clean_optional(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    return text or None


def parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, pd.Timestamp):
        dt = value.to_pydatetime()
        return dt.astimezone(UTC) if dt.tzinfo else dt.replace(tzinfo=UTC)
    if isinstance(value, str) and value.strip():
        try:
            dt = pd.to_datetime(value, utc=True).to_pydatetime()
            return dt.astimezone(UTC)
        except Exception:
            return None
    return None


def serialize_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
    try:
        return value.replace(tzinfo=UTC)
    except Exception:
        return None


def sanitize_asset_status(value: str | None) -> str:
    normalized = normalize_text(value)
    mapping = {
        "aktif": "Aktif",
        "kullanilabilir": "Aktif",
        "arizali": "Arizali",
        "ariza": "Arizali",
        "bakimda": "Arizali",
        "hurda": "Hurda",
    }
    return mapping.get(normalized, "Aktif")


def sanitize_maintenance_status(value: str | None) -> str:
    normalized = normalize_text(value)
    mapping = {
        "acik": "Acik",
        "devam_ediyor": "Devam Ediyor",
        "cozuldu": "Cozuldu",
    }
    return mapping.get(normalized, "Acik")


def document_to_asset(doc: firestore.DocumentSnapshot) -> Asset:
    data = doc.to_dict() or {}
    return Asset(
        id=doc.id,
        asset_id=data.get("asset_id", doc.id),
        name=data.get("name", ""),
        serial_number=data.get("serial_number"),
        category=data.get("category"),
        brand_model=data.get("brand_model"),
        status=sanitize_asset_status(data.get("status")),
        location=data.get("location", "Genel Merkez"),
        added_at=serialize_datetime(data.get("added_at")),
        created_by=data.get("created_by"),
        updated_at=serialize_datetime(data.get("updated_at")),
        assigned_to=data.get("assigned_to"),
        assigned_department=data.get("assigned_department"),
        assignment_id=data.get("assignment_id"),
    )


def document_to_maintenance(doc: firestore.DocumentSnapshot) -> MaintenanceRecord:
    data = doc.to_dict() or {}
    return MaintenanceRecord(
        id=doc.id,
        fault_id=data.get("fault_id", doc.id),
        asset_id=data.get("asset_id", ""),
        asset_name=data.get("asset_name", ""),
        description=data.get("description", ""),
        reported_by=data.get("reported_by", ""),
        date=serialize_datetime(data.get("date")) or now_utc(),
        status=sanitize_maintenance_status(data.get("status")),
    )


def document_to_stock(doc: firestore.DocumentSnapshot) -> StockItem:
    data = doc.to_dict() or {}
    quantity = int(data.get("quantity", 0))
    min_quantity = int(data.get("min_quantity", 0))
    return StockItem(
        id=doc.id,
        name=data.get("name", ""),
        category=data.get("category"),
        quantity=quantity,
        min_quantity=min_quantity,
        unit=data.get("unit", "adet"),
        low_stock=quantity <= min_quantity,
        updated_at=serialize_datetime(data.get("updated_at")),
    )


def document_to_log(doc: firestore.DocumentSnapshot) -> LogEntry:
    data = doc.to_dict() or {}
    return LogEntry(
        id=doc.id,
        user=data.get("user", ""),
        action=data.get("action", ""),
        detail=data.get("detail", ""),
        date=serialize_datetime(data.get("date")) or now_utc(),
    )


def document_to_personnel(doc: firestore.DocumentSnapshot) -> Personnel:
    data = doc.to_dict() or {}
    return Personnel(
        id=doc.id,
        full_name=data.get("full_name", ""),
        email=data.get("email"),
        department=data.get("department"),
        title=data.get("title"),
        location=data.get("location", "Genel Merkez"),
        employee_code=data.get("employee_code"),
        active_assignment_count=int(data.get("active_assignment_count", 0)),
        created_at=serialize_datetime(data.get("created_at")),
        updated_at=serialize_datetime(data.get("updated_at")),
    )


def document_to_assignment(doc: firestore.DocumentSnapshot) -> AssignmentRecord:
    data = doc.to_dict() or {}
    return AssignmentRecord(
        id=doc.id,
        asset_id=data.get("asset_id", ""),
        asset_name=data.get("asset_name", ""),
        asset_code=data.get("asset_code", ""),
        personnel_id=data.get("personnel_id", ""),
        personnel_name=data.get("personnel_name", ""),
        department=data.get("department"),
        note=data.get("note"),
        assigned_by=data.get("assigned_by", ""),
        assigned_at=serialize_datetime(data.get("assigned_at")) or now_utc(),
        returned_at=serialize_datetime(data.get("returned_at")),
        returned_by=data.get("returned_by"),
        is_active=bool(data.get("is_active", False)),
    )


class FirestoreService:
    def __init__(self) -> None:
        self.db = get_firestore_client()

    def add_log(self, user: str, action: str, detail: str) -> None:
        self.db.collection(LOGS).add(
            {
                "user": user,
                "action": action,
                "detail": detail,
                "date": firestore.SERVER_TIMESTAMP,
            }
        )

    def list_logs(self, limit_count: int = 100) -> list[LogEntry]:
        docs = (
            self.db.collection(LOGS)
            .order_by("date", direction=firestore.Query.DESCENDING)
            .limit(limit_count)
            .stream()
        )
        return [document_to_log(doc) for doc in docs]

    def list_assets(self) -> list[Asset]:
        docs = self.db.collection(ASSETS).stream()
        assets = [document_to_asset(doc) for doc in docs]
        return sorted(assets, key=lambda item: (item.name.lower(), item.asset_id.lower()))

    def get_asset(self, asset_id: str) -> Asset:
        doc = self.db.collection(ASSETS).document(asset_id).get()
        if not doc.exists:
            raise KeyError("Asset not found.")
        return document_to_asset(doc)

    def create_asset(self, payload: AssetCreate, user_email: str) -> Asset:
        doc_ref = self.db.collection(ASSETS).document(payload.asset_id)
        if doc_ref.get().exists:
            raise ValueError("Ayni Demirbas ID zaten mevcut.")

        now = now_utc()
        doc_ref.set(
            {
                **payload.model_dump(),
                "status": sanitize_asset_status(payload.status),
                "location": "Genel Merkez",
                "added_at": payload.added_at or now,
                "created_by": user_email,
                "updated_at": now,
                "assigned_to": None,
                "assigned_department": None,
                "assignment_id": None,
            }
        )
        self.add_log(user_email, "asset_created", f"{payload.asset_id} - {payload.name} olusturuldu.")
        return document_to_asset(doc_ref.get())

    def update_asset(self, asset_id: str, payload: AssetUpdate, user_email: str) -> Asset:
        doc_ref = self.db.collection(ASSETS).document(asset_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            raise KeyError("Asset not found.")

        data = {key: value for key, value in payload.model_dump().items() if value is not None}
        if "status" in data:
            data["status"] = sanitize_asset_status(data["status"])
        data["updated_at"] = now_utc()
        doc_ref.update(data)
        self.add_log(user_email, "asset_updated", f"{asset_id} guncellendi.")
        return document_to_asset(doc_ref.get())

    def delete_asset(self, asset_id: str, user_email: str) -> None:
        doc_ref = self.db.collection(ASSETS).document(asset_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            raise KeyError("Asset not found.")
        data = snapshot.to_dict() or {}
        if data.get("assignment_id"):
            raise ValueError("Aktif zimmeti olan demirbas silinemez.")
        name = data.get("name", asset_id)
        doc_ref.delete()
        self.add_log(user_email, "asset_deleted", f"{asset_id} - {name} silindi.")

    def _compose_brand_model(self, row: dict[str, Any]) -> str | None:
        brand_model = clean_optional(row.get("marka_model"))
        if brand_model:
            return brand_model

        brand = clean_optional(row.get("marka"))
        model = clean_optional(row.get("model"))
        if brand and model:
            return f"{brand} / {model}"
        return brand or model

    def _map_excel_columns(self, frame: pd.DataFrame) -> pd.DataFrame:
        mapped_columns: dict[str, str] = {}
        for column in frame.columns:
            normalized = normalize_text(column)
            aliases = {
                "demirbas_id": "demirbas_id",
                "lighthouse_otomatik_olusturulan_kod": "demirbas_id",
                "urun_adi": "urun_adi",
                "urun": "urun_adi",
                "ad": "urun_adi",
                "model": "urun_adi",
                "seri_no": "seri_no",
                "seri_numarasi": "seri_no",
                "kategori": "kategori",
                "kategori_agaci": "kategori_agaci",
                "marka": "marka",
                "marka_model": "marka_model",
                "durum": "durum",
                "lokasyon": "lokasyon",
                "konum": "lokasyon",
                "sube": "sube",
                "eklenme_tarihi": "eklenme_tarihi",
                "olusturma_tarihi": "eklenme_tarihi",
                "satin_alma_tarihi_gun_ay_yil": "satin_alma_tarihi",
                "zimmet": "zimmet",
            }
            if normalized in aliases:
                mapped_columns[column] = aliases[normalized]
        return frame.rename(columns=mapped_columns)

    def _resolve_asset_name(self, row: dict[str, Any]) -> str | None:
        explicit = clean_optional(row.get("urun_adi"))
        brand = clean_optional(row.get("marka"))
        model = clean_optional(row.get("model"))
        if explicit and explicit != model:
            return explicit
        if brand and model:
            return f"{brand} {model}"
        return explicit or model or brand

    def _get_personnel_cache(self) -> dict[str, Personnel]:
        return {
            normalize_text(item.full_name): item
            for item in self.list_personnel()
            if item.full_name.strip()
        }

    def _ensure_import_personnel(
        self,
        full_name: str,
        cache: dict[str, Personnel],
    ) -> Personnel:
        key = normalize_text(full_name)
        existing = cache.get(key)
        if existing:
            return existing

        doc_ref = self.db.collection(PERSONNEL).document()
        now = now_utc()
        doc_ref.set(
            {
                "full_name": full_name,
                "email": None,
                "department": None,
                "title": None,
                "location": "Genel Merkez",
                "employee_code": None,
                "active_assignment_count": 0,
                "created_at": now,
                "updated_at": now,
            }
        )
        personnel = document_to_personnel(doc_ref.get())
        cache[key] = personnel
        return personnel

    def _sync_import_assignment(
        self,
        asset_id: str,
        personnel_name: str,
        assigned_at: datetime,
        user_email: str,
        personnel_cache: dict[str, Personnel],
        active_assignments_by_asset: dict[str, AssignmentRecord],
    ) -> None:
        personnel = self._ensure_import_personnel(personnel_name, personnel_cache)
        asset_ref = self.db.collection(ASSETS).document(asset_id)
        asset_snapshot = asset_ref.get()
        if not asset_snapshot.exists:
            return

        asset = document_to_asset(asset_snapshot)
        current_assignment = active_assignments_by_asset.get(asset.id)

        if current_assignment and normalize_text(current_assignment.personnel_name) == normalize_text(personnel.full_name):
            asset_ref.update(
                {
                    "assigned_to": personnel.full_name,
                    "assigned_department": personnel.department,
                    "assignment_id": current_assignment.id,
                    "updated_at": now_utc(),
                }
            )
            self._sync_personnel_assignments(personnel.id)
            return

        if current_assignment:
            self.db.collection(ASSIGNMENTS).document(current_assignment.id).update(
                {
                    "returned_at": now_utc(),
                    "returned_by": user_email,
                    "is_active": False,
                }
            )
            self._sync_personnel_assignments(current_assignment.personnel_id)

        assignment_ref = self.db.collection(ASSIGNMENTS).document()
        assignment_ref.set(
            {
                "asset_id": asset.id,
                "asset_name": asset.name,
                "asset_code": asset.asset_id,
                "personnel_id": personnel.id,
                "personnel_name": personnel.full_name,
                "department": personnel.department,
                "note": "Excel import zimmet senkronizasyonu",
                "assigned_by": user_email,
                "assigned_at": assigned_at,
                "returned_at": None,
                "returned_by": None,
                "is_active": True,
            }
        )
        asset_ref.update(
            {
                "assigned_to": personnel.full_name,
                "assigned_department": personnel.department,
                "assignment_id": assignment_ref.id,
                "updated_at": now_utc(),
            }
        )
        active_assignments_by_asset[asset.id] = document_to_assignment(assignment_ref.get())
        self._sync_personnel_assignments(personnel.id)

    def import_assets_from_excel(self, content: bytes, user_email: str) -> ImportResult:
        frame = pd.read_excel(BytesIO(content))
        frame = self._map_excel_columns(frame)

        required_columns = {"demirbas_id"}
        missing = required_columns - set(frame.columns)
        if missing:
            raise ValueError(f"Eksik zorunlu kolonlar: {', '.join(sorted(missing))}")

        warnings: list[str] = []
        imported_count = 0
        updated_count = 0
        skipped_count = 0
        batch = self.db.batch()
        personnel_cache = self._get_personnel_cache()
        active_assignments_by_asset = {
            item.asset_id: item for item in self.list_assignments(active_only=True)
        }
        assignment_sync_rows: list[tuple[str, str, datetime]] = []

        for index, raw_row in frame.iterrows():
            row = raw_row.to_dict()
            asset_id = clean_optional(row.get("demirbas_id"))
            name = self._resolve_asset_name(row)

            if not asset_id or not name:
                skipped_count += 1
                warnings.append(f"Satir {index + 2}: Demirbas ID veya urun adi uretilemedi, kayit atlandi.")
                continue

            location = clean_optional(row.get("lokasyon")) or "Genel Merkez"
            if normalize_text(location) not in {"genel_merkez", "merkez", "genel_merkez_lokasyon"}:
                warnings.append(
                    f"Satir {index + 2}: Lokasyon '{location}' olarak geldi, kurala uygun sekilde 'Genel Merkez' kullanildi."
                )

            added_at = (
                parse_datetime(row.get("eklenme_tarihi"))
                or parse_datetime(row.get("satin_alma_tarihi"))
                or now_utc()
            )
            category = clean_optional(row.get("kategori")) or clean_optional(row.get("kategori_agaci"))
            zimmet_name = clean_optional(row.get("zimmet"))
            doc_ref = self.db.collection(ASSETS).document(asset_id)
            existing_snapshot = doc_ref.get()
            existing = existing_snapshot.to_dict() if existing_snapshot.exists else {}

            payload = {
                "asset_id": asset_id,
                "name": name,
                "serial_number": clean_optional(row.get("seri_no")),
                "category": category,
                "brand_model": self._compose_brand_model(row),
                "status": sanitize_asset_status(clean_optional(row.get("durum"))),
                "location": "Genel Merkez",
                "added_at": added_at,
                "created_by": (existing or {}).get("created_by") or user_email,
                "updated_at": now_utc(),
                "assigned_to": zimmet_name or (existing or {}).get("assigned_to"),
                "assigned_department": (existing or {}).get("assigned_department"),
                "assignment_id": (existing or {}).get("assignment_id"),
            }

            batch.set(doc_ref, payload, merge=True)
            if existing_snapshot.exists:
                updated_count += 1
            else:
                imported_count += 1

            if zimmet_name:
                assignment_sync_rows.append((asset_id, zimmet_name, added_at))

        batch.commit()
        for asset_id, zimmet_name, assigned_at in assignment_sync_rows:
            self._sync_import_assignment(
                asset_id=asset_id,
                personnel_name=zimmet_name,
                assigned_at=assigned_at,
                user_email=user_email,
                personnel_cache=personnel_cache,
                active_assignments_by_asset=active_assignments_by_asset,
            )
        self.add_log(
            user_email,
            "excel_import",
            f"Excel import tamamlandi. Yeni: {imported_count}, Guncellenen: {updated_count}, Atlanan: {skipped_count}.",
        )
        return ImportResult(
            imported_count=imported_count,
            updated_count=updated_count,
            skipped_count=skipped_count,
            warnings=warnings[:30],
        )

    def list_maintenance(self) -> list[MaintenanceRecord]:
        docs = (
            self.db.collection(MAINTENANCE)
            .order_by("date", direction=firestore.Query.DESCENDING)
            .stream()
        )
        return [document_to_maintenance(doc) for doc in docs]

    def create_maintenance(self, payload: MaintenanceCreate, user_email: str) -> MaintenanceRecord:
        asset = self.get_asset(payload.asset_id)
        doc_ref = self.db.collection(MAINTENANCE).document()
        fault_id = f"FLT-{now_utc().strftime('%Y%m%d')}-{doc_ref.id[:6].upper()}"
        doc_ref.set(
            {
                "fault_id": fault_id,
                "asset_id": asset.id,
                "asset_name": asset.name,
                "description": payload.description.strip(),
                "reported_by": user_email,
                "date": now_utc(),
                "status": "Acik",
            }
        )
        self.db.collection(ASSETS).document(asset.id).update({"status": "Arizali", "updated_at": now_utc()})
        self.add_log(user_email, "maintenance_created", f"{asset.asset_id} icin ariza kaydi acildi.")
        return document_to_maintenance(doc_ref.get())

    def update_maintenance(self, maintenance_id: str, payload: MaintenanceUpdate, user_email: str) -> MaintenanceRecord:
        doc_ref = self.db.collection(MAINTENANCE).document(maintenance_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            raise KeyError("Maintenance record not found.")

        current = document_to_maintenance(snapshot)
        status = sanitize_maintenance_status(payload.status)
        doc_ref.update({"status": status})

        if status == "Cozuldu":
            self.db.collection(ASSETS).document(current.asset_id).update({"status": "Aktif", "updated_at": now_utc()})

        self.add_log(user_email, "maintenance_updated", f"{current.fault_id} durumu {status} oldu.")
        return document_to_maintenance(doc_ref.get())

    def list_stock(self) -> list[StockItem]:
        docs = self.db.collection(STOCK).stream()
        items = [document_to_stock(doc) for doc in docs]
        return sorted(items, key=lambda item: item.name.lower())

    def create_stock(self, payload: StockCreate, user_email: str) -> StockItem:
        doc_ref = self.db.collection(STOCK).document()
        doc_ref.set({**payload.model_dump(), "updated_at": now_utc()})
        self.add_log(user_email, "stock_created", f"{payload.name} stok kalemi eklendi.")
        return document_to_stock(doc_ref.get())

    def update_stock(self, stock_id: str, payload: StockUpdate, user_email: str) -> StockItem:
        doc_ref = self.db.collection(STOCK).document(stock_id)
        if not doc_ref.get().exists:
            raise KeyError("Stock item not found.")
        record = {key: value for key, value in payload.model_dump().items() if value is not None}
        record["updated_at"] = now_utc()
        doc_ref.update(record)
        self.add_log(user_email, "stock_updated", f"{stock_id} stok kalemi guncellendi.")
        return document_to_stock(doc_ref.get())

    def delete_stock(self, stock_id: str, user_email: str) -> None:
        doc_ref = self.db.collection(STOCK).document(stock_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            raise KeyError("Stock item not found.")
        name = (snapshot.to_dict() or {}).get("name", stock_id)
        doc_ref.delete()
        self.add_log(user_email, "stock_deleted", f"{name} stok kalemi silindi.")

    def list_personnel(self) -> list[Personnel]:
        docs = self.db.collection(PERSONNEL).stream()
        items = [document_to_personnel(doc) for doc in docs]
        return sorted(items, key=lambda item: item.full_name.lower())

    def create_personnel(self, payload: PersonnelCreate, user_email: str) -> Personnel:
        doc_ref = self.db.collection(PERSONNEL).document()
        now = now_utc()
        doc_ref.set(
            {
                **payload.model_dump(),
                "active_assignment_count": 0,
                "created_at": now,
                "updated_at": now,
            }
        )
        self.add_log(user_email, "personnel_created", f"{payload.full_name} personel kaydi eklendi.")
        return document_to_personnel(doc_ref.get())

    def update_personnel(self, personnel_id: str, payload: PersonnelUpdate, user_email: str) -> Personnel:
        doc_ref = self.db.collection(PERSONNEL).document(personnel_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            raise KeyError("Personnel not found.")
        data = {key: value for key, value in payload.model_dump().items() if value is not None}
        data["updated_at"] = now_utc()
        doc_ref.update(data)
        self.add_log(user_email, "personnel_updated", f"{personnel_id} personel kaydi guncellendi.")
        self._sync_personnel_assignments(personnel_id)
        return document_to_personnel(doc_ref.get())

    def delete_personnel(self, personnel_id: str, user_email: str) -> None:
        doc_ref = self.db.collection(PERSONNEL).document(personnel_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            raise KeyError("Personnel not found.")
        data = snapshot.to_dict() or {}
        if int(data.get("active_assignment_count", 0)) > 0:
            raise ValueError("Aktif zimmeti olan personel silinemez.")
        name = data.get("full_name", personnel_id)
        doc_ref.delete()
        self.add_log(user_email, "personnel_deleted", f"{name} personel kaydi silindi.")

    def list_assignments(self, active_only: bool = False) -> list[AssignmentRecord]:
        docs = self.db.collection(ASSIGNMENTS).stream()
        items = [document_to_assignment(doc) for doc in docs]
        if active_only:
            items = [item for item in items if item.is_active]
        return sorted(items, key=lambda item: item.assigned_at, reverse=True)

    def create_assignment(self, payload: AssignmentCreate, user_email: str) -> AssignmentRecord:
        asset_ref = self.db.collection(ASSETS).document(payload.asset_id)
        personnel_ref = self.db.collection(PERSONNEL).document(payload.personnel_id)
        asset_snapshot = asset_ref.get()
        personnel_snapshot = personnel_ref.get()

        if not asset_snapshot.exists:
            raise KeyError("Asset not found.")
        if not personnel_snapshot.exists:
            raise KeyError("Personnel not found.")

        asset = document_to_asset(asset_snapshot)
        personnel = document_to_personnel(personnel_snapshot)
        if asset.assignment_id:
            raise ValueError("Bu demirbas zaten zimmetli.")

        doc_ref = self.db.collection(ASSIGNMENTS).document()
        assigned_at = payload.assigned_at or now_utc()
        doc_ref.set(
            {
                "asset_id": asset.id,
                "asset_name": asset.name,
                "asset_code": asset.asset_id,
                "personnel_id": personnel.id,
                "personnel_name": personnel.full_name,
                "department": personnel.department,
                "note": clean_optional(payload.note),
                "assigned_by": user_email,
                "assigned_at": assigned_at,
                "returned_at": None,
                "returned_by": None,
                "is_active": True,
            }
        )
        asset_ref.update(
            {
                "assigned_to": personnel.full_name,
                "assigned_department": personnel.department,
                "assignment_id": doc_ref.id,
                "updated_at": now_utc(),
            }
        )
        self._sync_personnel_assignments(personnel.id)
        self.add_log(user_email, "assignment_created", f"{asset.asset_id} {personnel.full_name} uzerine zimmetlendi.")
        return document_to_assignment(doc_ref.get())

    def return_assignment(self, assignment_id: str, payload: AssignmentReturn, user_email: str) -> AssignmentRecord:
        assignment_ref = self.db.collection(ASSIGNMENTS).document(assignment_id)
        snapshot = assignment_ref.get()
        if not snapshot.exists:
            raise KeyError("Assignment not found.")

        assignment = document_to_assignment(snapshot)
        if not assignment.is_active:
            raise ValueError("Zimmet zaten iade edilmis.")

        assignment_ref.update(
            {
                "returned_at": payload.returned_at or now_utc(),
                "returned_by": user_email,
                "is_active": False,
                "note": clean_optional(payload.note) or assignment.note,
            }
        )
        self.db.collection(ASSETS).document(assignment.asset_id).update(
            {
                "assigned_to": None,
                "assigned_department": None,
                "assignment_id": None,
                "updated_at": now_utc(),
            }
        )
        self._sync_personnel_assignments(assignment.personnel_id)
        self.add_log(user_email, "assignment_returned", f"{assignment.asset_code} zimmeti iade alindi.")
        return document_to_assignment(assignment_ref.get())

    def _sync_personnel_assignments(self, personnel_id: str) -> None:
        active_count = sum(
            1 for item in self.list_assignments(active_only=True) if item.personnel_id == personnel_id
        )
        self.db.collection(PERSONNEL).document(personnel_id).update(
            {
                "active_assignment_count": active_count,
                "updated_at": now_utc(),
            }
        )

    def build_notifications(
        self, stock_items: Iterable[StockItem], maintenance_items: Iterable[MaintenanceRecord]
    ) -> list[NotificationItem]:
        notifications: list[NotificationItem] = []
        for item in stock_items:
            if item.low_stock:
                notifications.append(
                    NotificationItem(
                        id=f"stock-{item.id}",
                        type="stock",
                        title=f"Kritik stok: {item.name}",
                        detail=f"Mevcut {item.quantity} / Minimum {item.min_quantity}",
                    )
                )

        for item in maintenance_items:
            if item.status != "Cozuldu":
                notifications.append(
                    NotificationItem(
                        id=f"fault-{item.id}",
                        type="fault",
                        title=f"Acik ariza: {item.asset_name}",
                        detail=item.description,
                    )
                )
        return notifications[:10]

    def _build_status_breakdown(self, assets: list[Asset]) -> list[ChartDatum]:
        counts = Counter(item.status for item in assets)
        return [ChartDatum(label=label, value=counts.get(label, 0)) for label in ["Aktif", "Arizali", "Hurda"]]

    def _build_category_breakdown(self, assets: list[Asset]) -> list[ChartDatum]:
        counts = Counter(item.category or "Kategorisiz" for item in assets)
        return [ChartDatum(label=label, value=value) for label, value in counts.most_common(6)]

    def _build_assignment_department_breakdown(self, assignments: list[AssignmentRecord]) -> list[ChartDatum]:
        counts = Counter(item.department or "Departman Yok" for item in assignments if item.is_active)
        return [ChartDatum(label=label, value=value) for label, value in counts.most_common(6)]

    def _build_maintenance_trend(self, maintenance: list[MaintenanceRecord]) -> list[TrendDatum]:
        now = now_utc()
        buckets: list[TrendDatum] = []
        current_month = now.month
        current_year = now.year
        for offset in range(5, -1, -1):
            month = current_month - offset
            year = current_year
            while month <= 0:
                month += 12
                year -= 1
            count = sum(1 for item in maintenance if item.date.year == year and item.date.month == month)
            buckets.append(TrendDatum(label=f"{month:02d}/{year}", value=count))
        return buckets

    def get_dashboard(self) -> DashboardSummary:
        assets = self.list_assets()
        maintenance = self.list_maintenance()
        stock_items = self.list_stock()
        logs = self.list_logs(limit_count=10)
        assignments = self.list_assignments(active_only=True)
        notifications = self.build_notifications(stock_items, maintenance)

        return DashboardSummary(
            total_assets=len(assets),
            broken_assets=sum(1 for item in assets if item.status == "Arizali"),
            open_maintenance=sum(1 for item in maintenance if item.status != "Cozuldu"),
            low_stock_count=sum(1 for item in stock_items if item.low_stock),
            assigned_assets=len(assignments),
            low_stock_items=[item for item in stock_items if item.low_stock],
            recent_logs=logs,
            notifications=notifications,
            asset_status_breakdown=self._build_status_breakdown(assets),
            category_breakdown=self._build_category_breakdown(assets),
            maintenance_trend=self._build_maintenance_trend(maintenance),
            assignment_department_breakdown=self._build_assignment_department_breakdown(assignments),
        )

    def get_report_summary(self) -> ReportSummary:
        personnel = self.list_personnel()
        assignments = self.list_assignments(active_only=True)
        assets = self.list_assets()
        return ReportSummary(
            total_personnel=len(personnel),
            active_assignments=len(assignments),
            unassigned_assets=sum(1 for item in assets if not item.assignment_id),
            exported_at=now_utc(),
        )

    def export_report_workbook(self) -> bytes:
        assets = self.list_assets()
        maintenance = self.list_maintenance()
        stock_items = self.list_stock()
        personnel = self.list_personnel()
        assignments = self.list_assignments()

        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            pd.DataFrame(
                [
                    {
                        "Demirbas ID": item.asset_id,
                        "Urun Adi": item.name,
                        "Seri No": item.serial_number,
                        "Kategori": item.category,
                        "Marka / Model": item.brand_model,
                        "Durum": item.status,
                        "Lokasyon": item.location,
                        "Zimmetli Kisi": item.assigned_to,
                        "Departman": item.assigned_department,
                    }
                    for item in assets
                ]
            ).to_excel(writer, index=False, sheet_name="Demirbaslar")
            pd.DataFrame(
                [
                    {
                        "Ariza ID": item.fault_id,
                        "Demirbas": item.asset_name,
                        "Demirbas ID": item.asset_id,
                        "Aciklama": item.description,
                        "Bildiren": item.reported_by,
                        "Durum": item.status,
                        "Tarih": item.date.isoformat(),
                    }
                    for item in maintenance
                ]
            ).to_excel(writer, index=False, sheet_name="ArizaKayitlari")
            pd.DataFrame(
                [
                    {
                        "Personel": item.full_name,
                        "E-posta": item.email,
                        "Departman": item.department,
                        "Unvan": item.title,
                        "Personel Kodu": item.employee_code,
                        "Aktif Zimmet": item.active_assignment_count,
                    }
                    for item in personnel
                ]
            ).to_excel(writer, index=False, sheet_name="Personel")
            pd.DataFrame(
                [
                    {
                        "Demirbas ID": item.asset_code,
                        "Demirbas": item.asset_name,
                        "Personel": item.personnel_name,
                        "Departman": item.department,
                        "Not": item.note,
                        "Zimmet Tarihi": item.assigned_at.isoformat(),
                        "Iade Tarihi": item.returned_at.isoformat() if item.returned_at else None,
                        "Durum": "Aktif" if item.is_active else "Iade Edildi",
                    }
                    for item in assignments
                ]
            ).to_excel(writer, index=False, sheet_name="Zimmet")
            pd.DataFrame(
                [
                    {
                        "Urun": item.name,
                        "Kategori": item.category,
                        "Miktar": item.quantity,
                        "Min. Stok": item.min_quantity,
                        "Birim": item.unit,
                        "Kritik": "Evet" if item.low_stock else "Hayir",
                    }
                    for item in stock_items
                ]
            ).to_excel(writer, index=False, sheet_name="Stok")
        return output.getvalue()

    def export_assignments_csv(self) -> bytes:
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Demirbas ID", "Demirbas", "Personel", "Departman", "Zimmet Tarihi", "Iade Tarihi", "Durum"])
        for item in self.list_assignments():
            writer.writerow(
                [
                    item.asset_code,
                    item.asset_name,
                    item.personnel_name,
                    item.department or "",
                    item.assigned_at.isoformat(),
                    item.returned_at.isoformat() if item.returned_at else "",
                    "Aktif" if item.is_active else "Iade Edildi",
                ]
            )
        return output.getvalue().encode("utf-8-sig")

    def log_session(self, user_email: str, event: str) -> None:
        action = "user_login" if event == "login" else "user_register"
        detail = "Kullanici giris yapti." if event == "login" else "Yeni kullanici kaydoldu."
        self.add_log(user_email, action, detail)
