from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime
from io import BytesIO
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
        DashboardSummary,
        ImportResult,
        LogEntry,
        MaintenanceCreate,
        MaintenanceRecord,
        MaintenanceUpdate,
        NotificationItem,
        StockCreate,
        StockItem,
        StockUpdate,
    )
except ModuleNotFoundError:
    from app.core.firebase_admin import get_firestore_client
    from app.models.schemas import (
        Asset,
        AssetCreate,
        AssetUpdate,
        DashboardSummary,
        ImportResult,
        LogEntry,
        MaintenanceCreate,
        MaintenanceRecord,
        MaintenanceUpdate,
        NotificationItem,
        StockCreate,
        StockItem,
        StockUpdate,
    )


ASSETS = "assets"
MAINTENANCE = "maintenance"
STOCK = "stock"
LOGS = "logs"


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
        "arizali": "Arizali",
        "ariza": "Arizali",
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


class FirestoreService:
    def __init__(self) -> None:
        self.db = get_firestore_client()

    def add_log(self, user_email: str, action: str, detail: str) -> None:
        self.db.collection(LOGS).add(
            {
                "user": user_email,
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
        data = {
            **payload.model_dump(),
            "status": sanitize_asset_status(payload.status),
            "location": "Genel Merkez",
            "added_at": payload.added_at or now,
            "created_by": user_email,
            "updated_at": now,
        }
        doc_ref.set(data)
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
        name = (snapshot.to_dict() or {}).get("name", asset_id)
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
            if normalized in {
                "demirbas_id",
                "urun_adi",
                "seri_no",
                "kategori",
                "marka",
                "model",
                "marka_model",
                "durum",
                "lokasyon",
                "eklenme_tarihi",
            }:
                mapped_columns[column] = normalized

        normalized_frame = frame.rename(columns=mapped_columns)
        return normalized_frame

    def import_assets_from_excel(self, content: bytes, user_email: str) -> ImportResult:
        frame = pd.read_excel(BytesIO(content))
        frame = self._map_excel_columns(frame)

        required_columns = {"demirbas_id", "urun_adi"}
        missing = required_columns - set(frame.columns)
        if missing:
            raise ValueError(f"Eksik zorunlu kolonlar: {', '.join(sorted(missing))}")

        warnings: list[str] = []
        imported_count = 0
        updated_count = 0
        skipped_count = 0
        batch = self.db.batch()

        for index, raw_row in frame.iterrows():
            row = raw_row.to_dict()
            asset_id = clean_optional(row.get("demirbas_id"))
            name = clean_optional(row.get("urun_adi"))

            if not asset_id or not name:
                skipped_count += 1
                warnings.append(f"Satir {index + 2}: Demirbas ID veya Urun Adi bos, kayit atlandi.")
                continue

            location = clean_optional(row.get("lokasyon")) or "Genel Merkez"
            if normalize_text(location) not in {"genel_merkez", "merkez", "genel_merkez_lokasyon"}:
                warnings.append(
                    f"Satir {index + 2}: Lokasyon '{location}' olarak geldi, kurala uygun sekilde 'Genel Merkez' kullanildi."
                )

            added_at = parse_datetime(row.get("eklenme_tarihi")) or now_utc()
            doc_ref = self.db.collection(ASSETS).document(asset_id)
            exists = doc_ref.get().exists

            payload = {
                "asset_id": asset_id,
                "name": name,
                "serial_number": clean_optional(row.get("seri_no")),
                "category": clean_optional(row.get("kategori")),
                "brand_model": self._compose_brand_model(row),
                "status": sanitize_asset_status(clean_optional(row.get("durum"))),
                "location": "Genel Merkez",
                "added_at": added_at,
                "created_by": user_email,
                "updated_at": now_utc(),
            }

            batch.set(doc_ref, payload, merge=True)
            if exists:
                updated_count += 1
            else:
                imported_count += 1

        batch.commit()
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
        record = {
            "fault_id": fault_id,
            "asset_id": asset.id,
            "asset_name": asset.name,
            "description": payload.description.strip(),
            "reported_by": user_email,
            "date": now_utc(),
            "status": "Acik",
        }
        doc_ref.set(record)
        self.db.collection(ASSETS).document(asset.id).update(
            {"status": "Arizali", "updated_at": now_utc()}
        )
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
            self.db.collection(ASSETS).document(current.asset_id).update(
                {"status": "Aktif", "updated_at": now_utc()}
            )

        self.add_log(user_email, "maintenance_updated", f"{current.fault_id} durumu {status} oldu.")
        return document_to_maintenance(doc_ref.get())

    def list_stock(self) -> list[StockItem]:
        docs = self.db.collection(STOCK).stream()
        items = [document_to_stock(doc) for doc in docs]
        return sorted(items, key=lambda item: item.name.lower())

    def create_stock(self, payload: StockCreate, user_email: str) -> StockItem:
        doc_ref = self.db.collection(STOCK).document()
        record = {**payload.model_dump(), "updated_at": now_utc()}
        doc_ref.set(record)
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

    def get_dashboard(self) -> DashboardSummary:
        assets = self.list_assets()
        maintenance = self.list_maintenance()
        stock_items = self.list_stock()
        logs = self.list_logs(limit_count=10)
        notifications = self.build_notifications(stock_items, maintenance)

        return DashboardSummary(
            total_assets=len(assets),
            broken_assets=sum(1 for item in assets if item.status == "Arizali"),
            open_maintenance=sum(1 for item in maintenance if item.status != "Cozuldu"),
            low_stock_count=sum(1 for item in stock_items if item.low_stock),
            low_stock_items=[item for item in stock_items if item.low_stock],
            recent_logs=logs,
            notifications=notifications,
        )

    def log_session(self, user_email: str, event: str) -> None:
        action = "user_login" if event == "login" else "user_register"
        detail = "Kullanici giris yapti." if event == "login" else "Yeni kullanici kaydoldu."
        self.add_log(user_email, action, detail)
