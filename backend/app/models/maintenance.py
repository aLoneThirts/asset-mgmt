from pydantic import BaseModel
from typing import Optional


class MaintenanceRecord(BaseModel):
    id: str
    asset_id: str
    asset_name: Optional[str] = None
    description: str
    reported_by: str           # uid
    reported_by_email: str
    date: str
    status: str = "Açık"       # Açık / Devam Ediyor / Çözüldü


class MaintenanceCreate(BaseModel):
    asset_id: str
    description: str


class MaintenanceUpdate(BaseModel):
    status: str
    description: Optional[str] = None
