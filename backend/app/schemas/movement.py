from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

MovementType = Literal["PRODUCTION", "SALE", "LOSS", "ADJUSTMENT", "RETURN"]


class MovementCreate(BaseModel):
    """Manual movement creation (LOSS or ADJUSTMENT only — PRODUCTION is auto from batches,
    SALE from sales, RETURN from cancellations)."""
    product_id: int
    batch_id: Optional[int] = None
    movement_type: Literal["LOSS", "ADJUSTMENT"]
    quantity_boxes: int = Field(..., description="Positif ou négatif. LOSS = négatif obligatoire.")
    movement_date: date
    notes: str = Field(..., min_length=1, description="Note explicative obligatoire pour LOSS/ADJUSTMENT")

    @field_validator("quantity_boxes")
    @classmethod
    def _nonzero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("La quantité ne peut pas être 0")
        return v


class MovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    batch_id: Optional[int]
    created_by: int
    movement_type: MovementType
    quantity_boxes: int
    reference_type: Optional[str]
    reference_id: Optional[int]
    movement_date: date
    notes: Optional[str]
    created_at: datetime
    product_name: Optional[str] = None
    product_sku: Optional[str] = None


class InventoryRow(BaseModel):
    product_id: int
    product_name: str
    product_sku: str
    units_per_box: int
    image_url: Optional[str] = None
    stock_boxes: int
    stock_units: int
    unit_cost: Optional[float] = None
    stock_value: Optional[float] = None
    low_stock: bool
