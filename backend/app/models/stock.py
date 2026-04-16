from pydantic import BaseModel
from typing import Optional


class StockItem(BaseModel):
    id: str
    name: str
    quantity: int = 0
    min_quantity: int = 5
    unit: Optional[str] = None
    category: Optional[str] = None
    low_stock: bool = False


class StockCreate(BaseModel):
    name: str
    quantity: int = 0
    min_quantity: int = 5
    unit: Optional[str] = None
    category: Optional[str] = None


class StockUpdate(BaseModel):
    quantity: Optional[int] = None
    min_quantity: Optional[int] = None
    unit: Optional[str] = None
    category: Optional[str] = None
