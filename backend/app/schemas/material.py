from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Material ────────────────────────────────────────────────────────────────
class MaterialBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    unit: str = Field(..., min_length=1, max_length=20)
    low_stock_threshold: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None
    archived: bool = False


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    low_stock_threshold: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None
    archived: Optional[bool] = None


class MaterialRead(MaterialBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    current_stock: Decimal
    weighted_avg_price: Decimal
    created_at: datetime
    updated_at: datetime


# ── Purchase ────────────────────────────────────────────────────────────────
class MaterialPurchaseCreate(BaseModel):
    material_id: int
    quantity: Decimal = Field(..., gt=0)
    total_cost: Decimal = Field(..., ge=0)
    vendor: Optional[str] = Field(None, max_length=200)
    paid_by: Optional[str] = Field(None, max_length=100)
    purchase_date: date
    receipt_url: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None


class MaterialPurchaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    material_id: int
    material_name: Optional[str] = None
    material_unit: Optional[str] = None
    created_by: int
    quantity: Decimal
    total_cost: Decimal
    unit_price: Decimal
    vendor: Optional[str]
    paid_by: Optional[str]
    purchase_date: date
    receipt_url: Optional[str]
    notes: Optional[str]
    created_at: datetime


# ── Movement (lecture seule, créé via business logic) ───────────────────────
class MaterialMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    material_id: int
    material_name: Optional[str] = None
    movement_type: str
    quantity: Decimal
    batch_id: Optional[int]
    purchase_id: Optional[int]
    movement_date: date
    notes: Optional[str]
    created_at: datetime
