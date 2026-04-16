from __future__ import annotations

from functools import lru_cache

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import get_settings
from backend.app.core.security import AuthUser, get_current_user
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
    SessionLogRequest,
    StockCreate,
    StockItem,
    StockUpdate,
)
from backend.app.services.firestore_service import FirestoreService

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
