from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SaleStatus = Literal["PENDING", "DELIVERED", "PAID", "CANCELLED"]


class SaleItemCreate(BaseModel):
    product_id: int
    quantity_boxes: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    batch_id: Optional[int] = None


class SaleItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    batch_id: Optional[int]
    quantity_boxes: int
    unit_price: Decimal
    subtotal: Decimal
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_taxable: bool = False  # remonté depuis Product pour calcul TPS/TVQ par ligne


class SaleCreate(BaseModel):
    client_id: int
    sale_date: date
    items: list[SaleItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = None
    currency: str = "CAD"


class SaleStatusUpdate(BaseModel):
    status: SaleStatus
    payment_date: Optional[date] = None


class SaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    sale_date: date
    status: SaleStatus
    total_amount: Decimal
    currency: str
    payment_date: Optional[date]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: list[SaleItemRead]
    client_name: Optional[str] = None
    client_type: Optional[str] = None
