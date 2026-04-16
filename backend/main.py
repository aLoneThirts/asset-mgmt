from __future__ import annotations

from functools import lru_cache
from datetime import datetime, UTC

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth as firebase_auth

try:
    from backend.app.core.config import get_settings
    from backend.app.core.security import AuthUser, get_current_user, require_admin
    from backend.app.models.schemas import (
        AdminRoleUpdate,
        AdminUser,
        Asset,
        AssetCreate,
        AssetUpdate,
        DashboardSummary,
        ImportResult,
        LogEntry,
        MaintenanceCreate,
        MaintenanceRecord,
        MaintenanceUpdate,
        SessionLogRequest,
        StockCreate,
        StockItem,
        StockUpdate,
    )
    from backend.app.services.firestore_service import FirestoreService
except ModuleNotFoundError:
    from app.core.config import get_settings
    from app.core.security import AuthUser, get_current_user, require_admin
    from app.models.schemas import (
        AdminRoleUpdate,
        AdminUser,
        Asset,
        AssetCreate,
        AssetUpdate,
        DashboardSummary,
        ImportResult,
        LogEntry,
        MaintenanceCreate,
        MaintenanceRecord,
        MaintenanceUpdate,
        SessionLogRequest,
        StockCreate,
        StockItem,
        StockUpdate,
    )
    from app.services.firestore_service import FirestoreService

settings = get_settings()
app = FastAPI(title=settings.app_name)


@lru_cache
def get_service() -> FirestoreService:
    return FirestoreService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/session")
def log_session(
    request: SessionLogRequest,
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> dict[str, bool]:
    service.log_session(user.email, request.event)
    return {"ok": True}


@app.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(
    _: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> DashboardSummary:
    return service.get_dashboard()


@app.get("/logs", response_model=list[LogEntry])
def list_logs(
    limit: int = 100,
    _: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> list[LogEntry]:
    return service.list_logs(limit_count=min(max(limit, 1), 300))


@app.get("/assets", response_model=list[Asset])
def list_assets(
    _: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> list[Asset]:
    return service.list_assets()


@app.post("/assets", response_model=Asset, status_code=201)
def create_asset(
    payload: AssetCreate,
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> Asset:
    try:
        return service.create_asset(payload, user.email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put("/assets/{asset_id}", response_model=Asset)
def update_asset(
    asset_id: str,
    payload: AssetUpdate,
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> Asset:
    try:
        return service.update_asset(asset_id, payload, user.email)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/assets/{asset_id}")
def delete_asset(
    asset_id: str,
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> dict[str, bool]:
    try:
        service.delete_asset(asset_id, user.email)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}


@app.post("/imports/assets", response_model=ImportResult)
async def import_assets(
    file: UploadFile = File(...),
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> ImportResult:
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Sadece Excel dosyalari kabul edilir.")

    content = await file.read()
    try:
        return service.import_assets_from_excel(content, user.email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/maintenance", response_model=list[MaintenanceRecord])
def list_maintenance(
    _: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> list[MaintenanceRecord]:
    return service.list_maintenance()


@app.post("/maintenance", response_model=MaintenanceRecord, status_code=201)
def create_maintenance(
    payload: MaintenanceCreate,
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> MaintenanceRecord:
    try:
        return service.create_maintenance(payload, user.email)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/maintenance/{maintenance_id}", response_model=MaintenanceRecord)
def update_maintenance(
    maintenance_id: str,
    payload: MaintenanceUpdate,
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> MaintenanceRecord:
    try:
        return service.update_maintenance(maintenance_id, payload, user.email)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/stock", response_model=list[StockItem])
def list_stock(
    _: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> list[StockItem]:
    return service.list_stock()


@app.post("/stock", response_model=StockItem, status_code=201)
def create_stock(
    payload: StockCreate,
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> StockItem:
    return service.create_stock(payload, user.email)


@app.put("/stock/{stock_id}", response_model=StockItem)
def update_stock(
    stock_id: str,
    payload: StockUpdate,
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> StockItem:
    try:
        return service.update_stock(stock_id, payload, user.email)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/stock/{stock_id}")
def delete_stock(
    stock_id: str,
    user: AuthUser = Depends(get_current_user),
    service: FirestoreService = Depends(get_service),
) -> dict[str, bool]:
    try:
        service.delete_stock(stock_id, user.email)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}


def _from_millis(value: int | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromtimestamp(value / 1000, tz=UTC)


@app.get("/admin/users", response_model=list[AdminUser])
def list_admin_users(_: AuthUser = Depends(require_admin)) -> list[AdminUser]:
    users: list[AdminUser] = []

    for user_record in firebase_auth.list_users().iterate_all():
        claims = user_record.custom_claims or {}
        users.append(
            AdminUser(
                uid=user_record.uid,
                email=user_record.email,
                name=user_record.display_name,
                is_admin=bool(claims.get("admin")) or (
                    bool(user_record.email)
                    and user_record.email.lower() == settings.bootstrap_admin_email.lower()
                ),
                disabled=user_record.disabled,
                created_at=_from_millis(user_record.user_metadata.creation_timestamp),
                last_sign_in_at=_from_millis(user_record.user_metadata.last_sign_in_timestamp),
            )
        )

    return sorted(users, key=lambda item: ((item.email or "").lower(), item.uid))


@app.patch("/admin/users/{uid}/admin", response_model=AdminUser)
def update_admin_role(
    uid: str,
    payload: AdminRoleUpdate,
    acting_user: AuthUser = Depends(require_admin),
    service: FirestoreService = Depends(get_service),
) -> AdminUser:
    try:
        user_record = firebase_auth.get_user(uid)
    except firebase_auth.UserNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi.") from exc

    claims = dict(user_record.custom_claims or {})

    if payload.is_admin:
        claims["admin"] = True
    else:
        claims.pop("admin", None)

    firebase_auth.set_custom_user_claims(uid, claims or None)
    updated_record = firebase_auth.get_user(uid)
    updated_claims = updated_record.custom_claims or {}

    service.add_log(
        user=acting_user.email,
        action="admin-role-updated",
        detail=(
            f"{updated_record.email or updated_record.uid} icin admin yetkisi "
            f"{'verildi' if payload.is_admin else 'kaldirildi'}"
        ),
    )

    return AdminUser(
        uid=updated_record.uid,
        email=updated_record.email,
        name=updated_record.display_name,
        is_admin=bool(updated_claims.get("admin")) or (
            bool(updated_record.email)
            and updated_record.email.lower() == settings.bootstrap_admin_email.lower()
        ),
        disabled=updated_record.disabled,
        created_at=_from_millis(updated_record.user_metadata.creation_timestamp),
        last_sign_in_at=_from_millis(updated_record.user_metadata.last_sign_in_timestamp),
    )
