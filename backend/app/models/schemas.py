from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AssetStatus = Literal["Aktif", "Arizali", "Hurda"]
MaintenanceStatus = Literal["Acik", "Devam Ediyor", "Cozuldu"]


class AssetBase(BaseModel):
    asset_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    serial_number: str | None = None
    category: str | None = None
    brand_model: str | None = None
    status: AssetStatus = "Aktif"
    location: str = "Genel Merkez"
    added_at: datetime | None = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: str | None = None
    serial_number: str | None = None
    category: str | None = None
    brand_model: str | None = None
    status: AssetStatus | None = None


class Asset(AssetBase):
    id: str
    created_by: str | None = None
    updated_at: datetime | None = None


class MaintenanceCreate(BaseModel):
    asset_id: str
    description: str = Field(min_length=3)


class MaintenanceUpdate(BaseModel):
    status: MaintenanceStatus


class MaintenanceRecord(BaseModel):
    id: str
    fault_id: str
    asset_id: str
    asset_name: str
    description: str
    reported_by: str
    date: datetime
    status: MaintenanceStatus


class StockBase(BaseModel):
    name: str = Field(min_length=1)
    category: str | None = None
    quantity: int = Field(ge=0)
    min_quantity: int = Field(ge=0)
    unit: str = "adet"


class StockCreate(StockBase):
    pass


class StockUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    quantity: int | None = Field(default=None, ge=0)
    min_quantity: int | None = Field(default=None, ge=0)
    unit: str | None = None


class StockItem(StockBase):
    id: str
    low_stock: bool
    updated_at: datetime | None = None


class LogEntry(BaseModel):
    id: str
    user: str
    action: str
    detail: str
    date: datetime


class NotificationItem(BaseModel):
    id: str
    type: Literal["stock", "fault"]
    title: str
    detail: str


class DashboardSummary(BaseModel):
    total_assets: int
    broken_assets: int
    open_maintenance: int
    low_stock_count: int
    low_stock_items: list[StockItem]
    recent_logs: list[LogEntry]
    notifications: list[NotificationItem]


class ImportResult(BaseModel):
    imported_count: int
    updated_count: int
    skipped_count: int
    warnings: list[str]


class SessionLogRequest(BaseModel):
    event: Literal["login", "register"]
