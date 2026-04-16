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
    assigned_to: str | None = None
    assigned_department: str | None = None
    assignment_id: str | None = None


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
    assigned_assets: int
    low_stock_items: list[StockItem]
    recent_logs: list[LogEntry]
    notifications: list[NotificationItem]
    asset_status_breakdown: list["ChartDatum"]
    category_breakdown: list["ChartDatum"]
    maintenance_trend: list["TrendDatum"]
    assignment_department_breakdown: list["ChartDatum"]


class ImportResult(BaseModel):
    imported_count: int
    updated_count: int
    skipped_count: int
    warnings: list[str]


class SessionLogRequest(BaseModel):
    event: Literal["login", "register"]


class AdminUser(BaseModel):
    uid: str
    email: str | None = None
    name: str | None = None
    is_admin: bool = False
    disabled: bool = False
    created_at: datetime | None = None
    last_sign_in_at: datetime | None = None


class AdminRoleUpdate(BaseModel):
    is_admin: bool


class PersonnelBase(BaseModel):
    full_name: str = Field(min_length=2)
    email: str | None = None
    department: str | None = None
    title: str | None = None
    location: str = "Genel Merkez"
    employee_code: str | None = None


class PersonnelCreate(PersonnelBase):
    pass


class PersonnelUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2)
    email: str | None = None
    department: str | None = None
    title: str | None = None
    location: str | None = None
    employee_code: str | None = None


class Personnel(PersonnelBase):
    id: str
    active_assignment_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AssignmentCreate(BaseModel):
    asset_id: str
    personnel_id: str
    note: str | None = None
    assigned_at: datetime | None = None


class AssignmentReturn(BaseModel):
    note: str | None = None
    returned_at: datetime | None = None


class AssignmentRecord(BaseModel):
    id: str
    asset_id: str
    asset_name: str
    asset_code: str
    personnel_id: str
    personnel_name: str
    department: str | None = None
    note: str | None = None
    assigned_by: str
    assigned_at: datetime
    returned_at: datetime | None = None
    returned_by: str | None = None
    is_active: bool = True


class ChartDatum(BaseModel):
    label: str
    value: int


class TrendDatum(BaseModel):
    label: str
    value: int


class ReportSummary(BaseModel):
    total_personnel: int
    active_assignments: int
    unassigned_assets: int
    exported_at: datetime
