from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    sku: str = Field(..., min_length=1, max_length=50)
    units_per_box: int = Field(..., gt=0)
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    consumer_price: Optional[Decimal] = Field(None, ge=0, description="Prix de vente consommateur (PDS)")
    store_margin_pct: Optional[Decimal] = Field(None, ge=0, le=1, description="Marge magasin en fraction (0.35 = 35%)")
    price_broker: Optional[Decimal] = Field(None, ge=0)
    price_direct: Optional[Decimal] = Field(None, ge=0)
    currency: str = Field("CAD", min_length=3, max_length=3)
    active: bool = True
    image_url: Optional[str] = Field(None, max_length=500)
    taxable: bool = Field(False, description="Si True, TPS/TVQ ajoutées à la vente. Default False (épicerie QC détaxée).")
    gtin: Optional[str] = Field(None, max_length=14, description="Code GS1 GTIN-13/14 (numérique).")
    barcode_image_url: Optional[str] = Field(None, max_length=500)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    sku: Optional[str] = Field(None, min_length=1, max_length=50)
    units_per_box: Optional[int] = Field(None, gt=0)
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    consumer_price: Optional[Decimal] = Field(None, ge=0)
    store_margin_pct: Optional[Decimal] = Field(None, ge=0, le=1)
    price_broker: Optional[Decimal] = Field(None, ge=0)
    price_direct: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    active: Optional[bool] = None
    image_url: Optional[str] = Field(None, max_length=500)
    taxable: Optional[bool] = None
    gtin: Optional[str] = Field(None, max_length=14)
    barcode_image_url: Optional[str] = Field(None, max_length=500)


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
