from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Asset(BaseModel):
    id: str
    name: str
    serial_no: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    status: str = "Aktif"          # Aktif / Arızalı / Hurda
    location: str = "Genel Merkez"
    added_at: Optional[str] = None
    imported_by: Optional[str] = None


class AssetCreate(BaseModel):
    name: str
    serial_no: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    status: str = "Aktif"


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    serial_no: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None
