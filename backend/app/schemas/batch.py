from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BatchBase(BaseModel):
    product_id: int
    batch_number: str = Field(..., min_length=1, max_length=50)
    production_date: date
    expiry_date: Optional[date] = None
    quantity_boxes: int = Field(..., gt=0)
    total_cost: Decimal = Field(..., ge=0)
    notes: Optional[str] = None


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    batch_number: Optional[str] = Field(None, min_length=1, max_length=50)
    production_date: Optional[date] = None
    expiry_date: Optional[date] = None
    quantity_boxes: Optional[int] = Field(None, gt=0)
    total_cost: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None


class BatchRead(BatchBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    # Derived field (per-unit production cost) — computed in route
    unit_cost: Optional[Decimal] = None
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
