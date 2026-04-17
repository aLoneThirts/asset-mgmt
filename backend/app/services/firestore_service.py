from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from contextlib import contextmanager
from datetime import UTC, datetime
from io import BytesIO, StringIO
from pathlib import Path
import csv
import hashlib
import json
import math
import os
import re
import sqlite3
import threading
from typing import Any
from uuid import uuid4

import pandas as pd
from firebase_admin import storage as firebase_storage

try:
    from backend.app.core.config import get_settings
    from backend.app.core.firebase_admin import get_firebase_app
    from backend.app.models.schemas import (
        Asset,
        AssetCreate,
        AssetUpdate,
        AssignmentCreate,
        AssignmentRecord,
        AssignmentReturn,
        ChartDatum,
        DashboardSummary,
        ImportFileRecord,
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
    from app.core.config import get_settings
    from app.core.firebase_admin import get_firebase_app
    from app.models.schemas import (
        Asset,
        AssetCreate,
        AssetUpdate,
        AssignmentCreate,
        AssignmentRecord,
        AssignmentReturn,
        ChartDatum,
        DashboardSummary,
        ImportFileRecord,
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


def clean_assignment_name(value: Any) -> str | None:
    text = clean_optional(value)
    if not text:
        return None
    raw = text.strip()
    if raw in {"-", "--", "---", "."}:
        return None
    normalized = normalize_text(text)
    if not normalized:
        return None
    if normalized in {"yok", "none", "null", "nan", "atanmadi", "atanmamis"}:
        return None
    if len(raw) < 2:
        return None
    return text


def extract_department_from_location(value: Any) -> str | None:
    text = clean_optional(value)
    if not text:
        return None

    raw = text.replace("\\", "/").strip()
    if raw in {"-", "--", "---", "."}:
        return None

    # Most exports duplicate path with "/" (e.g. "...-UHM/22.Kat-Allianz Tower")
    primary = raw.split("/", 1)[0].strip()
    if not primary:
        return None

    parts = [segment.strip() for segment in re.split(r"\s*-\s*", primary) if clean_optional(segment)]
    if not parts:
        return None

    ignored_exact = {
        "allianz",
        "tower",
        "allianz_tower",
        "allianz_tower_merkez",
        "merkez",
        "genel_merkez",
        "genel_merkez_lokasyon",
    }

    for candidate in reversed(parts):
        normalized = normalize_text(candidate)
        if not normalized:
            continue
        if normalized in ignored_exact:
            continue
        if "allianz" in normalized and "tower" in normalized:
            continue
        if re.fullmatch(r"\d+_kat", normalized) or re.fullmatch(r"kat_\d+", normalized):
            continue
        if normalized.endswith("_kat"):
            continue
        return candidate

    return None


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
            dt = pd.to_datetime(value, utc=True, dayfirst=True).to_pydatetime()
            return dt.astimezone(UTC)
        except Exception:
            return None
    return None


def to_db_datetime(value: datetime | None) -> str | None:
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat()


def from_db_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
    text = str(value).strip()
    if not text:
        return None
    try:
        dt = datetime.fromisoformat(text)
        return dt.astimezone(UTC) if dt.tzinfo else dt.replace(tzinfo=UTC)
    except ValueError:
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


def row_to_asset(row: sqlite3.Row) -> Asset:
    return Asset(
        id=row["id"],
        asset_id=row["asset_id"],
        name=row["name"],
        serial_number=row["serial_number"],
        category=row["category"],
        brand_model=row["brand_model"],
        status=sanitize_asset_status(row["status"]),
        location=row["location"] or "Genel Merkez",
        added_at=from_db_datetime(row["added_at"]),
        created_by=row["created_by"],
        updated_at=from_db_datetime(row["updated_at"]),
        assigned_to=row["assigned_to"],
        assigned_department=row["assigned_department"],
        assignment_id=row["assignment_id"],
    )


def row_to_maintenance(row: sqlite3.Row) -> MaintenanceRecord:
    return MaintenanceRecord(
        id=row["id"],
        fault_id=row["fault_id"],
        asset_id=row["asset_id"],
        asset_name=row["asset_name"],
        description=row["description"],
        reported_by=row["reported_by"],
        date=from_db_datetime(row["date"]) or now_utc(),
        status=sanitize_maintenance_status(row["status"]),
    )


def row_to_stock(row: sqlite3.Row) -> StockItem:
    quantity = int(row["quantity"] or 0)
    min_quantity = int(row["min_quantity"] or 0)
    return StockItem(
        id=row["id"],
        name=row["name"],
        category=row["category"],
        quantity=quantity,
        min_quantity=min_quantity,
        unit=row["unit"] or "adet",
        low_stock=quantity <= min_quantity,
        updated_at=from_db_datetime(row["updated_at"]),
    )


def row_to_log(row: sqlite3.Row) -> LogEntry:
    return LogEntry(
        id=row["id"],
        user=row["user"] or "",
        action=row["action"] or "",
        detail=row["detail"] or "",
        date=from_db_datetime(row["date"]) or now_utc(),
    )


def row_to_personnel(row: sqlite3.Row) -> Personnel:
    return Personnel(
        id=row["id"],
        full_name=row["full_name"],
        email=row["email"],
        department=row["department"],
        title=row["title"],
        location=row["location"] or "Genel Merkez",
        employee_code=row["employee_code"],
        active_assignment_count=int(row["active_assignment_count"] or 0),
        created_at=from_db_datetime(row["created_at"]),
        updated_at=from_db_datetime(row["updated_at"]),
    )


def row_to_assignment(row: sqlite3.Row) -> AssignmentRecord:
    return AssignmentRecord(
        id=row["id"],
        asset_id=row["asset_id"],
        asset_name=row["asset_name"],
        asset_code=row["asset_code"],
        personnel_id=row["personnel_id"],
        personnel_name=row["personnel_name"],
        department=row["department"],
        note=row["note"],
        assigned_by=row["assigned_by"],
        assigned_at=from_db_datetime(row["assigned_at"]) or now_utc(),
        returned_at=from_db_datetime(row["returned_at"]),
        returned_by=row["returned_by"],
        is_active=bool(row["is_active"]),
    )


def row_to_import_file(row: sqlite3.Row) -> ImportFileRecord:
    return ImportFileRecord(
        id=row["id"],
        file_name=row["file_name"],
        file_hash=row["file_hash"],
        uploaded_by=row["uploaded_by"],
        uploaded_at=from_db_datetime(row["uploaded_at"]) or now_utc(),
        total_rows=int(row["total_rows"] or 0),
        imported_count=int(row["imported_count"] or 0),
        updated_count=int(row["updated_count"] or 0),
        skipped_count=int(row["skipped_count"] or 0),
        warning_count=int(row["warning_count"] or 0),
        status=row["status"] or "completed",
        error_message=row["error_message"],
    )


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid4().hex[:16]}"


class FirestoreService:
    """Compatibility class name: now backed by SQL (SQLite), not Firestore."""

    def __init__(self) -> None:
        settings = get_settings()
        self.database_path = self._resolve_database_path(settings.database_url)
        self._lock = threading.RLock()
        self._cloud_bucket_candidates = self._build_cloud_bucket_candidates(settings.firebase_storage_bucket, settings.firebase_project_id)
        self._cloud_sync_enabled = bool(os.getenv("VERCEL") and self._cloud_bucket_candidates)
        self._requires_durable_storage = bool(os.getenv("VERCEL") and self.database_path.startswith("/tmp"))
        self._cloud_bucket_name = self._cloud_bucket_candidates[0] if self._cloud_bucket_candidates else ""
        self._cloud_blob_name = "asset-mgmt/sqlite/asset_mgmt.db"
        self._cloud_generation: int | None = None
        self._last_cloud_pull_at: datetime | None = None
        self._cloud_dirty = False
        self._bulk_write_depth = 0
        if self._requires_durable_storage and not self._cloud_sync_enabled:
            raise RuntimeError(
                "Kalici veri saklama aktif degil. Vercel uzerinde FIREBASE_STORAGE_BUCKET veya kalici DATABASE_URL tanimlanmali."
            )
        self._open_connection()
        if self._cloud_sync_enabled:
            self._sync_from_cloud(force=True)
        self._init_schema()
        if self._cloud_sync_enabled:
            self._sync_to_cloud()

    def _open_connection(self) -> None:
        self.conn = sqlite3.connect(self.database_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")

    def _build_cloud_bucket_candidates(self, bucket_name: str | None, project_id: str | None) -> list[str]:
        candidates: list[str] = []

        def add_candidate(value: str | None) -> None:
            candidate = (value or "").strip()
            if not candidate or candidate in candidates:
                return
            candidates.append(candidate)

        add_candidate(bucket_name)

        if bucket_name:
            if bucket_name.endswith(".firebasestorage.app"):
                add_candidate(bucket_name.replace(".firebasestorage.app", ".appspot.com"))
            elif bucket_name.endswith(".appspot.com"):
                add_candidate(bucket_name.replace(".appspot.com", ".firebasestorage.app"))

        if project_id:
            add_candidate(f"{project_id}.firebasestorage.app")
            add_candidate(f"{project_id}.appspot.com")

        return candidates

    def _get_cloud_blob(self):
        if not self._cloud_sync_enabled:
            return None
        last_error: Exception | None = None
        app = get_firebase_app()
        for bucket_name in self._cloud_bucket_candidates:
            try:
                bucket = firebase_storage.bucket(name=bucket_name, app=app)
                blob = bucket.blob(self._cloud_blob_name)
                self._cloud_bucket_name = bucket_name
                return blob
            except Exception as exc:
                last_error = exc

        if self._requires_durable_storage and last_error is not None:
            raise RuntimeError(
                "Kalici depolama baglantisi kurulamadi. FIREBASE_STORAGE_BUCKET ayarini kontrol edin."
            ) from last_error
        return None

    def _sync_from_cloud(self, force: bool = False) -> None:
        if not self._cloud_sync_enabled:
            return

        if self._cloud_dirty and not force:
            # Never overwrite local state while there are pending unsynced writes.
            return

        now = now_utc()
        if (
            not force
            and self._last_cloud_pull_at is not None
            and (now - self._last_cloud_pull_at).total_seconds() < 2
        ):
            return
        self._last_cloud_pull_at = now

        blob = self._get_cloud_blob()
        if not blob:
            if self._requires_durable_storage:
                raise RuntimeError(
                    "Kalici depolama baglantisi kurulamadi. FIREBASE_STORAGE_BUCKET ayarini kontrol edin."
                )
            return

        temp_path = f"{self.database_path}.download"
        try:
            blob.reload()
            generation = int(blob.generation) if blob.generation else None
            if not force and generation is not None and generation == self._cloud_generation:
                return
            blob.download_to_filename(temp_path)
            try:
                self.conn.close()
            except Exception:
                pass
            os.replace(temp_path, self.database_path)
            self._open_connection()
            self._cloud_generation = generation
        except Exception as exc:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
            if self._is_cloud_object_missing(exc):
                return
            if self._requires_durable_storage:
                raise RuntimeError("Kalici veri senkronizasyonu basarisiz oldu. Lutfen tekrar deneyin.") from exc

    def _is_cloud_generation_conflict(self, exc: Exception) -> bool:
        message = str(exc).lower()
        class_name = exc.__class__.__name__.lower()
        code = str(getattr(exc, "code", "")).strip()
        return (
            "precondition" in class_name
            or "precondition" in message
            or "conditionnotmet" in message
            or "if_generation_match" in message
            or code == "412"
        )

    def _is_cloud_object_missing(self, exc: Exception) -> bool:
        message = str(exc).lower()
        class_name = exc.__class__.__name__.lower()
        code = str(getattr(exc, "code", "")).strip()
        if "bucket" in message and "not" in message:
            return False
        return (
            code == "404"
            or "404" in message
            or "notfound" in class_name
            or "not found" in message
            or "no such object" in message
        )

    def _sync_to_cloud(self) -> None:
        if not self._cloud_sync_enabled:
            return
        if not self._cloud_dirty:
            return
        blob = self._get_cloud_blob()
        if not blob:
            if self._requires_durable_storage:
                raise RuntimeError(
                    "Kalici depolama baglantisi kurulamadi. FIREBASE_STORAGE_BUCKET ayarini kontrol edin."
                )
            return

        try:
            if self._cloud_generation is not None:
                blob.upload_from_filename(
                    self.database_path,
                    content_type="application/x-sqlite3",
                    if_generation_match=self._cloud_generation,
                )
            else:
                blob.upload_from_filename(
                    self.database_path,
                    content_type="application/x-sqlite3",
                )
            blob.reload()
            self._cloud_generation = int(blob.generation) if blob.generation else self._cloud_generation
            self._cloud_dirty = False
            return
        except Exception as exc:
            if self._is_cloud_generation_conflict(exc):
                self._last_cloud_pull_at = None
                try:
                    self._sync_from_cloud(force=True)
                    self._cloud_dirty = False
                except Exception:
                    pass
                raise RuntimeError("Veri baska bir oturum tarafindan degistirildi. Lutfen islemi tekrar deneyin.") from exc
            raise RuntimeError("Veri senkronizasyonu basarisiz oldu. Lutfen tekrar deneyin.") from exc

    def _begin_bulk_write(self) -> None:
        with self._lock:
            self._bulk_write_depth += 1

    def _end_bulk_write(self) -> None:
        with self._lock:
            self._bulk_write_depth = max(0, self._bulk_write_depth - 1)
            if self._bulk_write_depth == 0:
                self._sync_to_cloud()

    def _resolve_database_path(self, database_url: str | None) -> str:
        db_url = (database_url or "").strip()
        if db_url:
            if db_url.startswith("sqlite:///"):
                path = db_url.removeprefix("sqlite:///")
            elif db_url.startswith("sqlite://"):
                path = db_url.removeprefix("sqlite://")
            else:
                raise RuntimeError("Su an yalnizca sqlite DATABASE_URL destekleniyor.")
        else:
            if os.getenv("VERCEL"):
                path = "/tmp/asset_mgmt.db"
            else:
                path = str(Path(__file__).resolve().parents[2] / "asset_mgmt.db")

        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        return path

    def _init_schema(self) -> None:
        schema = """
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            asset_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            serial_number TEXT,
            category TEXT,
            brand_model TEXT,
            status TEXT NOT NULL DEFAULT 'Aktif',
            location TEXT NOT NULL DEFAULT 'Genel Merkez',
            added_at TEXT,
            created_by TEXT,
            updated_at TEXT,
            assigned_to TEXT,
            assigned_department TEXT,
            assignment_id TEXT
        );

        CREATE TABLE IF NOT EXISTS maintenance (
            id TEXT PRIMARY KEY,
            fault_id TEXT NOT NULL UNIQUE,
            asset_id TEXT NOT NULL,
            asset_name TEXT NOT NULL,
            description TEXT NOT NULL,
            reported_by TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS stock (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            quantity INTEGER NOT NULL,
            min_quantity INTEGER NOT NULL,
            unit TEXT NOT NULL DEFAULT 'adet',
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS logs (
            id TEXT PRIMARY KEY,
            user TEXT NOT NULL,
            action TEXT NOT NULL,
            detail TEXT NOT NULL,
            date TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS personnel (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT,
            department TEXT,
            title TEXT,
            location TEXT NOT NULL DEFAULT 'Genel Merkez',
            employee_code TEXT,
            active_assignment_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS assignments (
            id TEXT PRIMARY KEY,
            asset_id TEXT NOT NULL,
            asset_name TEXT NOT NULL,
            asset_code TEXT NOT NULL,
            personnel_id TEXT NOT NULL,
            personnel_name TEXT NOT NULL,
            department TEXT,
            note TEXT,
            assigned_by TEXT NOT NULL,
            assigned_at TEXT NOT NULL,
            returned_at TEXT,
            returned_by TEXT,
            is_active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS import_files (
            id TEXT PRIMARY KEY,
            file_name TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            uploaded_by TEXT NOT NULL,
            uploaded_at TEXT NOT NULL,
            total_rows INTEGER NOT NULL DEFAULT 0,
            imported_count INTEGER NOT NULL DEFAULT 0,
            updated_count INTEGER NOT NULL DEFAULT 0,
            skipped_count INTEGER NOT NULL DEFAULT 0,
            warning_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'completed',
            warnings TEXT,
            error_message TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(name);
        CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
        CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance(date);
        CREATE INDEX IF NOT EXISTS idx_assignments_asset_active ON assignments(asset_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_assignments_personnel_active ON assignments(personnel_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_import_files_uploaded_at ON import_files(uploaded_at DESC);
        CREATE INDEX IF NOT EXISTS idx_import_files_hash_status ON import_files(file_hash, status);
        """
        with self._lock:
            self.conn.executescript(schema)
            self.conn.commit()

    def _query_all(self, query: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
        with self._lock:
            self._sync_from_cloud()
            cur = self.conn.execute(query, params)
            rows = cur.fetchall()
            cur.close()
            return rows

    def _query_one(self, query: str, params: tuple[Any, ...] = ()) -> sqlite3.Row | None:
        with self._lock:
            self._sync_from_cloud()
            cur = self.conn.execute(query, params)
            row = cur.fetchone()
            cur.close()
            return row

    def _execute(self, query: str, params: tuple[Any, ...] = ()) -> None:
        with self._lock:
            if self._bulk_write_depth == 0:
                self._sync_from_cloud(force=True)
            self.conn.execute(query, params)
            self.conn.commit()
            self._cloud_dirty = True
            if self._bulk_write_depth == 0:
                self._sync_to_cloud()

    @contextmanager
    def _transaction(self):
        with self._lock:
            try:
                if self._bulk_write_depth == 0:
                    self._sync_from_cloud(force=True)
                self.conn.execute("BEGIN")
                yield self.conn
                self.conn.commit()
                self._cloud_dirty = True
                if self._bulk_write_depth == 0:
                    self._sync_to_cloud()
            except Exception:
                self.conn.rollback()
                raise
    def add_log(self, user: str, action: str, detail: str) -> None:
        self._execute(
            "INSERT INTO logs (id, user, action, detail, date) VALUES (?, ?, ?, ?, ?)",
            (new_id("log_"), user, action, detail, to_db_datetime(now_utc())),
        )

    def list_logs(self, limit_count: int = 100) -> list[LogEntry]:
        rows = self._query_all("SELECT * FROM logs ORDER BY date DESC LIMIT ?", (int(limit_count),))
        return [row_to_log(row) for row in rows]

    def list_asset_import_history(self, limit_count: int = 50, uploaded_by: str | None = None) -> list[ImportFileRecord]:
        query = "SELECT * FROM import_files"
        params: list[Any] = []
        if uploaded_by:
            query += " WHERE uploaded_by = ?"
            params.append(uploaded_by)
        query += " ORDER BY uploaded_at DESC LIMIT ?"
        params.append(int(limit_count))
        rows = self._query_all(query, tuple(params))
        return [row_to_import_file(row) for row in rows]

    def _record_import_file(
        self,
        *,
        file_name: str,
        file_hash: str,
        uploaded_by: str,
        uploaded_at: datetime,
        total_rows: int,
        imported_count: int,
        updated_count: int,
        skipped_count: int,
        warnings: list[str],
        status: str,
        error_message: str | None = None,
    ) -> None:
        self._execute(
            """
            INSERT INTO import_files (
                id, file_name, file_hash, uploaded_by, uploaded_at, total_rows,
                imported_count, updated_count, skipped_count, warning_count, status, warnings, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                new_id("imp_"),
                file_name,
                file_hash,
                uploaded_by,
                to_db_datetime(uploaded_at),
                int(total_rows),
                int(imported_count),
                int(updated_count),
                int(skipped_count),
                int(len(warnings)),
                status,
                json.dumps(warnings[:80], ensure_ascii=False) if warnings else None,
                error_message,
            ),
        )

    def list_assets(self) -> list[Asset]:
        rows = self._query_all("SELECT * FROM assets")
        items = [row_to_asset(row) for row in rows]
        return sorted(items, key=lambda item: (item.name.lower(), item.asset_id.lower()))

    def get_asset(self, asset_id: str) -> Asset:
        row = self._query_one("SELECT * FROM assets WHERE id = ? OR asset_id = ? LIMIT 1", (asset_id, asset_id))
        if not row:
            raise KeyError("Asset not found.")
        return row_to_asset(row)

    def create_asset(self, payload: AssetCreate, user_email: str) -> Asset:
        existing = self._query_one(
            "SELECT id FROM assets WHERE asset_id = ? OR id = ? LIMIT 1",
            (payload.asset_id, payload.asset_id),
        )
        if existing:
            raise ValueError("Ayni Demirbas ID zaten mevcut.")

        now = now_utc()
        self._execute(
            """
            INSERT INTO assets (
                id, asset_id, name, serial_number, category, brand_model, status, location,
                added_at, created_by, updated_at, assigned_to, assigned_department, assignment_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.asset_id,
                payload.asset_id,
                payload.name,
                clean_optional(payload.serial_number),
                clean_optional(payload.category),
                clean_optional(payload.brand_model),
                sanitize_asset_status(payload.status),
                "Genel Merkez",
                to_db_datetime(payload.added_at or now),
                user_email,
                to_db_datetime(now),
                None,
                None,
                None,
            ),
        )
        self.add_log(user_email, "asset_created", f"{payload.asset_id} - {payload.name} olusturuldu.")
        return self.get_asset(payload.asset_id)

    def update_asset(self, asset_id: str, payload: AssetUpdate, user_email: str) -> Asset:
        row = self._query_one("SELECT * FROM assets WHERE id = ? OR asset_id = ? LIMIT 1", (asset_id, asset_id))
        if not row:
            raise KeyError("Asset not found.")

        target_id = row["id"]
        updates: dict[str, Any] = {"updated_at": to_db_datetime(now_utc())}
        if payload.name is not None:
            updates["name"] = payload.name.strip()
        if payload.serial_number is not None:
            updates["serial_number"] = clean_optional(payload.serial_number)
        if payload.category is not None:
            updates["category"] = clean_optional(payload.category)
        if payload.brand_model is not None:
            updates["brand_model"] = clean_optional(payload.brand_model)
        if payload.status is not None:
            updates["status"] = sanitize_asset_status(payload.status)

        columns = ", ".join(f"{key} = ?" for key in updates)
        params = tuple(updates.values()) + (target_id,)
        self._execute(f"UPDATE assets SET {columns} WHERE id = ?", params)
        self.add_log(user_email, "asset_updated", f"{asset_id} guncellendi.")
        return self.get_asset(target_id)

    def delete_asset(self, asset_id: str, user_email: str) -> None:
        row = self._query_one("SELECT * FROM assets WHERE id = ? OR asset_id = ? LIMIT 1", (asset_id, asset_id))
        if not row:
            raise KeyError("Asset not found.")
        if row["assignment_id"]:
            raise ValueError("Aktif zimmeti olan demirbas silinemez.")
        self._execute("DELETE FROM assets WHERE id = ?", (row["id"],))
        self.add_log(user_email, "asset_deleted", f"{row['asset_id']} - {row['name']} silindi.")

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

    def _compose_brand_model(self, row: dict[str, Any]) -> str | None:
        composed = clean_optional(row.get("marka_model"))
        if composed:
            return composed
        brand = clean_optional(row.get("marka"))
        model = clean_optional(row.get("model"))
        if brand and model:
            return f"{brand} / {model}"
        return brand or model

    def _get_personnel_cache(self) -> dict[str, Personnel]:
        rows = self._query_all("SELECT * FROM personnel")
        cache: dict[str, Personnel] = {}
        for row in rows:
            person = row_to_personnel(row)
            if person.full_name.strip():
                cache[normalize_text(person.full_name)] = person
        return cache

    def _list_assignments_raw(self, active_only: bool = False) -> list[AssignmentRecord]:
        query = "SELECT * FROM assignments"
        if active_only:
            query += " WHERE is_active = 1"
        rows = self._query_all(query)
        return [row_to_assignment(row) for row in rows]

    def _ensure_import_personnel(
        self,
        full_name: str,
        cache: dict[str, Personnel],
        department: str | None = None,
    ) -> Personnel:
        key = normalize_text(full_name)
        existing = cache.get(key)
        if existing:
            new_department = clean_optional(department)
            if new_department and existing.department != new_department:
                self._execute(
                    "UPDATE personnel SET department = ?, updated_at = ? WHERE id = ?",
                    (new_department, to_db_datetime(now_utc()), existing.id),
                )
                existing = row_to_personnel(self._query_one("SELECT * FROM personnel WHERE id = ?", (existing.id,)))
                cache[key] = existing
            return existing

        personnel_id = new_id("prs_")
        now = now_utc()
        self._execute(
            """
            INSERT INTO personnel (
                id, full_name, email, department, title, location, employee_code,
                active_assignment_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                personnel_id,
                full_name,
                None,
                clean_optional(department),
                None,
                "Genel Merkez",
                None,
                0,
                to_db_datetime(now),
                to_db_datetime(now),
            ),
        )
        person = row_to_personnel(self._query_one("SELECT * FROM personnel WHERE id = ?", (personnel_id,)))
        cache[key] = person
        return person

    def _sync_import_assignment(
        self,
        asset_id: str,
        asset_name: str,
        asset_code: str,
        personnel_name: str,
        department: str | None,
        assigned_at: datetime,
        user_email: str,
        personnel_cache: dict[str, Personnel],
        active_assignments_by_asset: dict[str, AssignmentRecord],
    ) -> None:
        personnel = self._ensure_import_personnel(personnel_name, personnel_cache, department=department)
        current_assignment = active_assignments_by_asset.get(asset_id)
        effective_department = clean_optional(department) or personnel.department

        if current_assignment and normalize_text(current_assignment.personnel_name) == normalize_text(personnel.full_name):
            assignment_department = effective_department or current_assignment.department
            self._execute(
                "UPDATE assignments SET department = ? WHERE id = ?",
                (assignment_department, current_assignment.id),
            )
            self._execute(
                """
                UPDATE assets
                SET assigned_to = ?, assigned_department = ?, assignment_id = ?, updated_at = ?
                WHERE id = ? OR asset_id = ?
                """,
                (
                    personnel.full_name,
                    assignment_department,
                    current_assignment.id,
                    to_db_datetime(now_utc()),
                    asset_id,
                    asset_id,
                ),
            )
            active_assignments_by_asset[asset_id] = AssignmentRecord(
                id=current_assignment.id,
                asset_id=current_assignment.asset_id,
                asset_name=current_assignment.asset_name,
                asset_code=current_assignment.asset_code,
                personnel_id=current_assignment.personnel_id,
                personnel_name=current_assignment.personnel_name,
                department=assignment_department,
                note=current_assignment.note,
                assigned_by=current_assignment.assigned_by,
                assigned_at=current_assignment.assigned_at,
                returned_at=current_assignment.returned_at,
                returned_by=current_assignment.returned_by,
                is_active=current_assignment.is_active,
            )
            return

        if current_assignment:
            self._execute(
                "UPDATE assignments SET returned_at = ?, returned_by = ?, is_active = 0 WHERE id = ?",
                (to_db_datetime(now_utc()), user_email, current_assignment.id),
            )

        assignment_id = new_id("asn_")
        assignment_department = effective_department
        self._execute(
            """
            INSERT INTO assignments (
                id, asset_id, asset_name, asset_code, personnel_id, personnel_name, department, note,
                assigned_by, assigned_at, returned_at, returned_by, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                assignment_id,
                asset_id,
                asset_name,
                asset_code,
                personnel.id,
                personnel.full_name,
                assignment_department,
                "Excel import zimmet senkronizasyonu",
                user_email,
                to_db_datetime(assigned_at),
                None,
                None,
                1,
            ),
        )
        self._execute(
            """
            UPDATE assets
            SET assigned_to = ?, assigned_department = ?, assignment_id = ?, updated_at = ?
            WHERE id = ? OR asset_id = ?
            """,
            (
                personnel.full_name,
                assignment_department,
                assignment_id,
                to_db_datetime(now_utc()),
                asset_id,
                asset_id,
            ),
        )
        active_assignments_by_asset[asset_id] = AssignmentRecord(
            id=assignment_id,
            asset_id=asset_id,
            asset_name=asset_name,
            asset_code=asset_code,
            personnel_id=personnel.id,
            personnel_name=personnel.full_name,
            department=assignment_department,
            note="Excel import zimmet senkronizasyonu",
            assigned_by=user_email,
            assigned_at=assigned_at,
            returned_at=None,
            returned_by=None,
            is_active=True,
        )

    def _clear_import_assignment(
        self,
        asset_id: str,
        user_email: str,
        active_assignments_by_asset: dict[str, AssignmentRecord],
    ) -> None:
        current_assignment = active_assignments_by_asset.get(asset_id)
        if current_assignment:
            self._execute(
                """
                UPDATE assignments
                SET returned_at = ?, returned_by = ?, is_active = 0, note = COALESCE(note, ?)
                WHERE id = ?
                """,
                (
                    to_db_datetime(now_utc()),
                    user_email,
                    "Excel import zimmet temizleme",
                    current_assignment.id,
                ),
            )
            active_assignments_by_asset.pop(asset_id, None)

        self._execute(
            """
            UPDATE assets
            SET assigned_to = NULL, assigned_department = NULL, assignment_id = NULL, updated_at = ?
            WHERE id = ? OR asset_id = ?
            """,
            (to_db_datetime(now_utc()), asset_id, asset_id),
        )
    def _rebuild_personnel_assignment_counts(self) -> None:
        rows = self._query_all(
            """
            SELECT personnel_id, COUNT(*) AS active_count
            FROM assignments
            WHERE is_active = 1
            GROUP BY personnel_id
            """
        )
        count_map = {row["personnel_id"]: int(row["active_count"]) for row in rows}
        now = to_db_datetime(now_utc())
        with self._transaction() as conn:
            conn.execute("UPDATE personnel SET active_assignment_count = 0, updated_at = ?", (now,))
            for personnel_id, active_count in count_map.items():
                conn.execute(
                    "UPDATE personnel SET active_assignment_count = ?, updated_at = ? WHERE id = ?",
                    (active_count, now, personnel_id),
                )

    def import_assets_from_excel(self, content: bytes, user_email: str, file_name: str | None = None) -> ImportResult:
        uploaded_at = now_utc()
        normalized_file_name = clean_optional(file_name) or f"import-{uploaded_at.strftime('%Y%m%d-%H%M%S')}.xlsx"
        file_hash = hashlib.sha256(content).hexdigest()
        total_rows = 0

        self._begin_bulk_write()
        try:
            existing_import = self._query_one(
                """
                SELECT * FROM import_files
                WHERE file_hash = ? AND status IN ('completed', 'duplicate_skipped')
                ORDER BY uploaded_at DESC
                LIMIT 1
                """,
                (file_hash,),
            )
            if existing_import:
                existing_meta = row_to_import_file(existing_import)
                warnings = [
                    (
                        "Ayni dosya daha once yuklenmis. Mukerrer kayit olusmamasi icin import atlandi. "
                        f"Son yukleme: {existing_meta.uploaded_at.isoformat()}"
                    )
                ]
                self._record_import_file(
                    file_name=normalized_file_name,
                    file_hash=file_hash,
                    uploaded_by=user_email,
                    uploaded_at=uploaded_at,
                    total_rows=existing_meta.total_rows,
                    imported_count=0,
                    updated_count=0,
                    skipped_count=existing_meta.total_rows,
                    warnings=warnings,
                    status="duplicate_skipped",
                    error_message=None,
                )
                self.add_log(user_email, "excel_import_duplicate", f"{normalized_file_name} dosyasi tekrar yuklenmek istendi.")
                return ImportResult(imported_count=0, updated_count=0, skipped_count=existing_meta.total_rows, warnings=warnings)

            frame = pd.read_excel(BytesIO(content))
            frame = self._map_excel_columns(frame)
            total_rows = int(len(frame.index))

            required_columns = {"demirbas_id"}
            missing = required_columns - set(frame.columns)
            if missing:
                raise ValueError(f"Eksik zorunlu kolonlar: {', '.join(sorted(missing))}")

            warnings: list[str] = []
            imported_count = 0
            updated_count = 0
            skipped_count = 0

            existing_assets = {item.asset_id: item for item in self.list_assets()}
            personnel_cache = self._get_personnel_cache()
            active_assignments_by_asset = {
                item.asset_id: item for item in self._list_assignments_raw(active_only=True)
            }
            assignment_sync_rows: dict[str, tuple[str, str, str | None, datetime]] = {}
            assignment_clear_rows: set[str] = set()

            location_override_count = 0
            location_examples: list[str] = []

            with self._transaction() as conn:
                for index, raw_row in frame.iterrows():
                    row = raw_row.to_dict()
                    asset_id = clean_optional(row.get("demirbas_id"))
                    name = self._resolve_asset_name(row)

                    if not asset_id or not name:
                        skipped_count += 1
                        warnings.append(f"Satir {index + 2}: Demirbas ID veya urun adi uretilemedi, kayit atlandi.")
                        continue

                    location = clean_optional(row.get("lokasyon")) or "Genel Merkez"
                    inferred_department = extract_department_from_location(location)
                    if normalize_text(location) not in {"genel_merkez", "merkez", "genel_merkez_lokasyon"}:
                        location_override_count += 1
                        if len(location_examples) < 3 and location not in location_examples:
                            location_examples.append(location)

                    added_at = (
                        parse_datetime(row.get("eklenme_tarihi"))
                        or parse_datetime(row.get("satin_alma_tarihi"))
                        or now_utc()
                    )
                    category = clean_optional(row.get("kategori")) or clean_optional(row.get("kategori_agaci"))
                    zimmet_name = clean_assignment_name(row.get("zimmet"))

                    existing_asset = existing_assets.get(asset_id)
                    existing_assignment = active_assignments_by_asset.get(asset_id)

                    if existing_asset:
                        conn.execute(
                            """
                            UPDATE assets
                            SET name = ?, serial_number = ?, category = ?, brand_model = ?, status = ?, location = ?,
                                added_at = ?, updated_at = ?, assigned_to = ?, assigned_department = ?, assignment_id = ?
                            WHERE id = ? OR asset_id = ?
                            """,
                            (
                                name,
                                clean_optional(row.get("seri_no")),
                                category,
                                self._compose_brand_model(row),
                                sanitize_asset_status(clean_optional(row.get("durum"))),
                                "Genel Merkez",
                                to_db_datetime(added_at),
                                to_db_datetime(now_utc()),
                                zimmet_name,
                                (
                                    inferred_department
                                    or (existing_assignment.department if (zimmet_name and existing_assignment) else None)
                                ),
                                existing_assignment.id if (zimmet_name and existing_assignment) else None,
                                existing_asset.id,
                                existing_asset.asset_id,
                            ),
                        )
                        updated_count += 1
                    else:
                        conn.execute(
                            """
                            INSERT INTO assets (
                                id, asset_id, name, serial_number, category, brand_model, status, location,
                                added_at, created_by, updated_at, assigned_to, assigned_department, assignment_id
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                asset_id,
                                asset_id,
                                name,
                                clean_optional(row.get("seri_no")),
                                category,
                                self._compose_brand_model(row),
                                sanitize_asset_status(clean_optional(row.get("durum"))),
                                "Genel Merkez",
                                to_db_datetime(added_at),
                                user_email,
                                to_db_datetime(now_utc()),
                                zimmet_name,
                                (
                                    inferred_department
                                    or (existing_assignment.department if (zimmet_name and existing_assignment) else None)
                                ),
                                existing_assignment.id if (zimmet_name and existing_assignment) else None,
                            ),
                        )
                        imported_count += 1

                    if zimmet_name:
                        assignment_sync_rows[asset_id] = (name, zimmet_name, inferred_department, added_at)
                        assignment_clear_rows.discard(asset_id)
                    elif existing_assignment or (existing_asset and (existing_asset.assignment_id or existing_asset.assigned_to)):
                        assignment_clear_rows.add(asset_id)
                        assignment_sync_rows.pop(asset_id, None)

            for asset_id, (asset_name, zimmet_name, inferred_department, assigned_at) in assignment_sync_rows.items():
                self._sync_import_assignment(
                    asset_id=asset_id,
                    asset_name=asset_name,
                    asset_code=asset_id,
                    personnel_name=zimmet_name,
                    department=inferred_department,
                    assigned_at=assigned_at,
                    user_email=user_email,
                    personnel_cache=personnel_cache,
                    active_assignments_by_asset=active_assignments_by_asset,
                )
            for asset_id in assignment_clear_rows:
                self._clear_import_assignment(
                    asset_id=asset_id,
                    user_email=user_email,
                    active_assignments_by_asset=active_assignments_by_asset,
                )

            self._rebuild_personnel_assignment_counts()

            if location_override_count:
                if location_examples:
                    warnings.append(
                        f"{location_override_count} satirda lokasyon kurali nedeniyle 'Genel Merkez' uygulandi. "
                        f"Ornek konumlar: {', '.join(location_examples)}"
                    )
                else:
                    warnings.append(f"{location_override_count} satirda lokasyon kurali nedeniyle 'Genel Merkez' uygulandi.")

            self._record_import_file(
                file_name=normalized_file_name,
                file_hash=file_hash,
                uploaded_by=user_email,
                uploaded_at=uploaded_at,
                total_rows=total_rows,
                imported_count=imported_count,
                updated_count=updated_count,
                skipped_count=skipped_count,
                warnings=warnings,
                status="completed",
                error_message=None,
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
        except Exception as exc:
            error_message = str(exc)
            try:
                self._record_import_file(
                    file_name=normalized_file_name,
                    file_hash=file_hash,
                    uploaded_by=user_email,
                    uploaded_at=uploaded_at,
                    total_rows=total_rows,
                    imported_count=0,
                    updated_count=0,
                    skipped_count=total_rows,
                    warnings=[error_message] if error_message else [],
                    status="failed",
                    error_message=error_message,
                )
            except Exception:
                pass
            raise
        finally:
            self._end_bulk_write()

    def list_maintenance(self) -> list[MaintenanceRecord]:
        rows = self._query_all("SELECT * FROM maintenance ORDER BY date DESC")
        return [row_to_maintenance(row) for row in rows]

    def create_maintenance(self, payload: MaintenanceCreate, user_email: str) -> MaintenanceRecord:
        asset = self.get_asset(payload.asset_id)
        maintenance_id = new_id("flt_")
        fault_id = f"FLT-{now_utc().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"
        with self._transaction() as conn:
            conn.execute(
                """
                INSERT INTO maintenance (id, fault_id, asset_id, asset_name, description, reported_by, date, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    maintenance_id,
                    fault_id,
                    asset.id,
                    asset.name,
                    payload.description.strip(),
                    user_email,
                    to_db_datetime(now_utc()),
                    "Acik",
                ),
            )
            conn.execute(
                "UPDATE assets SET status = ?, updated_at = ? WHERE id = ?",
                ("Arizali", to_db_datetime(now_utc()), asset.id),
            )
        self.add_log(user_email, "maintenance_created", f"{asset.asset_id} icin ariza kaydi acildi.")
        row = self._query_one("SELECT * FROM maintenance WHERE id = ?", (maintenance_id,))
        return row_to_maintenance(row)

    def update_maintenance(self, maintenance_id: str, payload: MaintenanceUpdate, user_email: str) -> MaintenanceRecord:
        row = self._query_one("SELECT * FROM maintenance WHERE id = ?", (maintenance_id,))
        if not row:
            raise KeyError("Maintenance record not found.")
        current = row_to_maintenance(row)
        status = sanitize_maintenance_status(payload.status)
        with self._transaction() as conn:
            conn.execute("UPDATE maintenance SET status = ? WHERE id = ?", (status, maintenance_id))
            if status == "Cozuldu":
                conn.execute(
                    "UPDATE assets SET status = ?, updated_at = ? WHERE id = ?",
                    ("Aktif", to_db_datetime(now_utc()), current.asset_id),
                )
        self.add_log(user_email, "maintenance_updated", f"{current.fault_id} durumu {status} oldu.")
        updated = self._query_one("SELECT * FROM maintenance WHERE id = ?", (maintenance_id,))
        return row_to_maintenance(updated)

    def list_stock(self) -> list[StockItem]:
        rows = self._query_all("SELECT * FROM stock")
        items = [row_to_stock(row) for row in rows]
        return sorted(items, key=lambda item: item.name.lower())

    def create_stock(self, payload: StockCreate, user_email: str) -> StockItem:
        stock_id = new_id("stk_")
        self._execute(
            """
            INSERT INTO stock (id, name, category, quantity, min_quantity, unit, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                stock_id,
                payload.name,
                clean_optional(payload.category),
                int(payload.quantity),
                int(payload.min_quantity),
                clean_optional(payload.unit) or "adet",
                to_db_datetime(now_utc()),
            ),
        )
        self.add_log(user_email, "stock_created", f"{payload.name} stok kalemi eklendi.")
        return row_to_stock(self._query_one("SELECT * FROM stock WHERE id = ?", (stock_id,)))

    def update_stock(self, stock_id: str, payload: StockUpdate, user_email: str) -> StockItem:
        row = self._query_one("SELECT * FROM stock WHERE id = ?", (stock_id,))
        if not row:
            raise KeyError("Stock item not found.")
        updates: dict[str, Any] = {"updated_at": to_db_datetime(now_utc())}
        if payload.name is not None:
            updates["name"] = payload.name
        if payload.category is not None:
            updates["category"] = clean_optional(payload.category)
        if payload.quantity is not None:
            updates["quantity"] = int(payload.quantity)
        if payload.min_quantity is not None:
            updates["min_quantity"] = int(payload.min_quantity)
        if payload.unit is not None:
            updates["unit"] = clean_optional(payload.unit) or "adet"

        columns = ", ".join(f"{key} = ?" for key in updates)
        params = tuple(updates.values()) + (stock_id,)
        self._execute(f"UPDATE stock SET {columns} WHERE id = ?", params)
        self.add_log(user_email, "stock_updated", f"{stock_id} stok kalemi guncellendi.")
        return row_to_stock(self._query_one("SELECT * FROM stock WHERE id = ?", (stock_id,)))

    def delete_stock(self, stock_id: str, user_email: str) -> None:
        row = self._query_one("SELECT * FROM stock WHERE id = ?", (stock_id,))
        if not row:
            raise KeyError("Stock item not found.")
        self._execute("DELETE FROM stock WHERE id = ?", (stock_id,))
        self.add_log(user_email, "stock_deleted", f"{row['name']} stok kalemi silindi.")
    def list_personnel(self) -> list[Personnel]:
        rows = self._query_all("SELECT * FROM personnel")
        items = [row_to_personnel(row) for row in rows]
        return sorted(items, key=lambda item: item.full_name.lower())

    def create_personnel(self, payload: PersonnelCreate, user_email: str) -> Personnel:
        personnel_id = new_id("prs_")
        now = now_utc()
        self._execute(
            """
            INSERT INTO personnel (
                id, full_name, email, department, title, location, employee_code,
                active_assignment_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                personnel_id,
                payload.full_name.strip(),
                clean_optional(payload.email),
                clean_optional(payload.department),
                clean_optional(payload.title),
                clean_optional(payload.location) or "Genel Merkez",
                clean_optional(payload.employee_code),
                0,
                to_db_datetime(now),
                to_db_datetime(now),
            ),
        )
        self.add_log(user_email, "personnel_created", f"{payload.full_name} personel kaydi eklendi.")
        return row_to_personnel(self._query_one("SELECT * FROM personnel WHERE id = ?", (personnel_id,)))

    def update_personnel(self, personnel_id: str, payload: PersonnelUpdate, user_email: str) -> Personnel:
        row = self._query_one("SELECT * FROM personnel WHERE id = ?", (personnel_id,))
        if not row:
            raise KeyError("Personnel not found.")
        updates: dict[str, Any] = {"updated_at": to_db_datetime(now_utc())}
        if payload.full_name is not None:
            updates["full_name"] = payload.full_name.strip()
        if payload.email is not None:
            updates["email"] = clean_optional(payload.email)
        if payload.department is not None:
            updates["department"] = clean_optional(payload.department)
        if payload.title is not None:
            updates["title"] = clean_optional(payload.title)
        if payload.location is not None:
            updates["location"] = clean_optional(payload.location) or "Genel Merkez"
        if payload.employee_code is not None:
            updates["employee_code"] = clean_optional(payload.employee_code)

        columns = ", ".join(f"{key} = ?" for key in updates)
        params = tuple(updates.values()) + (personnel_id,)
        self._execute(f"UPDATE personnel SET {columns} WHERE id = ?", params)

        updated_row = self._query_one("SELECT * FROM personnel WHERE id = ?", (personnel_id,))
        person = row_to_personnel(updated_row)
        self._execute(
            "UPDATE assignments SET personnel_name = ?, department = ? WHERE personnel_id = ? AND is_active = 1",
            (person.full_name, person.department, personnel_id),
        )
        self._execute(
            """
            UPDATE assets
            SET assigned_to = ?, assigned_department = ?, updated_at = ?
            WHERE assignment_id IN (
                SELECT id FROM assignments WHERE personnel_id = ? AND is_active = 1
            )
            """,
            (person.full_name, person.department, to_db_datetime(now_utc()), personnel_id),
        )
        self._sync_personnel_assignments(personnel_id)
        self.add_log(user_email, "personnel_updated", f"{personnel_id} personel kaydi guncellendi.")
        return row_to_personnel(self._query_one("SELECT * FROM personnel WHERE id = ?", (personnel_id,)))

    def delete_personnel(self, personnel_id: str, user_email: str) -> None:
        row = self._query_one("SELECT * FROM personnel WHERE id = ?", (personnel_id,))
        if not row:
            raise KeyError("Personnel not found.")
        active_count = self._query_one(
            "SELECT COUNT(*) AS total FROM assignments WHERE personnel_id = ? AND is_active = 1",
            (personnel_id,),
        )["total"]
        if int(active_count) > 0:
            raise ValueError("Aktif zimmeti olan personel silinemez.")
        self._execute("DELETE FROM personnel WHERE id = ?", (personnel_id,))
        self.add_log(user_email, "personnel_deleted", f"{row['full_name']} personel kaydi silindi.")

    def list_assignments(self, active_only: bool = False) -> list[AssignmentRecord]:
        query = "SELECT * FROM assignments"
        if active_only:
            query += " WHERE is_active = 1"
        query += " ORDER BY assigned_at DESC"
        rows = self._query_all(query)
        return [row_to_assignment(row) for row in rows]

    def create_assignment(self, payload: AssignmentCreate, user_email: str) -> AssignmentRecord:
        asset = self.get_asset(payload.asset_id)
        personnel_row = self._query_one("SELECT * FROM personnel WHERE id = ?", (payload.personnel_id,))
        if not personnel_row:
            raise KeyError("Personnel not found.")
        personnel = row_to_personnel(personnel_row)
        if asset.assignment_id:
            raise ValueError("Bu demirbas zaten zimmetli.")

        assignment_id = new_id("asn_")
        assigned_at = payload.assigned_at or now_utc()
        with self._transaction() as conn:
            conn.execute(
                """
                INSERT INTO assignments (
                    id, asset_id, asset_name, asset_code, personnel_id, personnel_name, department, note,
                    assigned_by, assigned_at, returned_at, returned_by, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    assignment_id,
                    asset.id,
                    asset.name,
                    asset.asset_id,
                    personnel.id,
                    personnel.full_name,
                    personnel.department,
                    clean_optional(payload.note),
                    user_email,
                    to_db_datetime(assigned_at),
                    None,
                    None,
                    1,
                ),
            )
            conn.execute(
                """
                UPDATE assets
                SET assigned_to = ?, assigned_department = ?, assignment_id = ?, updated_at = ?
                WHERE id = ?
                """,
                (personnel.full_name, personnel.department, assignment_id, to_db_datetime(now_utc()), asset.id),
            )
        self._sync_personnel_assignments(personnel.id)
        self.add_log(user_email, "assignment_created", f"{asset.asset_id} {personnel.full_name} uzerine zimmetlendi.")
        return row_to_assignment(self._query_one("SELECT * FROM assignments WHERE id = ?", (assignment_id,)))

    def return_assignment(self, assignment_id: str, payload: AssignmentReturn, user_email: str) -> AssignmentRecord:
        row = self._query_one("SELECT * FROM assignments WHERE id = ?", (assignment_id,))
        if not row:
            raise KeyError("Assignment not found.")
        assignment = row_to_assignment(row)
        if not assignment.is_active:
            raise ValueError("Zimmet zaten iade edilmis.")

        returned_at = payload.returned_at or now_utc()
        note = clean_optional(payload.note) or assignment.note
        with self._transaction() as conn:
            conn.execute(
                "UPDATE assignments SET returned_at = ?, returned_by = ?, is_active = 0, note = ? WHERE id = ?",
                (to_db_datetime(returned_at), user_email, note, assignment_id),
            )
            conn.execute(
                """
                UPDATE assets
                SET assigned_to = NULL, assigned_department = NULL, assignment_id = NULL, updated_at = ?
                WHERE id = ?
                """,
                (to_db_datetime(now_utc()), assignment.asset_id),
            )

        self._sync_personnel_assignments(assignment.personnel_id)
        self.add_log(user_email, "assignment_returned", f"{assignment.asset_code} zimmeti iade alindi.")
        return row_to_assignment(self._query_one("SELECT * FROM assignments WHERE id = ?", (assignment_id,)))

    def _sync_personnel_assignments(self, personnel_id: str) -> None:
        row = self._query_one(
            "SELECT COUNT(*) AS total FROM assignments WHERE personnel_id = ? AND is_active = 1",
            (personnel_id,),
        )
        active_count = int(row["total"] if row else 0)
        self._execute(
            "UPDATE personnel SET active_assignment_count = ?, updated_at = ? WHERE id = ?",
            (active_count, to_db_datetime(now_utc()), personnel_id),
        )
    def build_notifications(self, stock_items: Iterable[StockItem], maintenance_items: Iterable[MaintenanceRecord]) -> list[NotificationItem]:
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
