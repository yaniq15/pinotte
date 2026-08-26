from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SaleStatus = Literal["PENDING", "DELIVERED", "PAID", "CANCELLED"]
SaleItemLineType = Literal["PRODUCT", "LOT_ADJUSTMENT", "LOSS_ADJUSTMENT"]


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
    line_type: SaleItemLineType = "PRODUCT"
    notes: Optional[str] = None
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_taxable: bool = False  # remonté depuis Product pour calcul TPS/TVQ par ligne
    product_units_per_box: Optional[int] = None  # remonté depuis Product pour révision de perte par unité


class SaleCreate(BaseModel):
    client_id: int
    sale_date: date
    items: list[SaleItemCreate] = Field(..., min_length=1)
    notes: Optional[str] = None
    currency: str = "CAD"


class SaleStatusUpdate(BaseModel):
    status: SaleStatus
    payment_date: Optional[date] = None


# ── Révisions de facture ────────────────────────────────────────────────
class LotPriceRevisionLine(BaseModel):
    item_id: int  # id de la ligne SaleItem (line_type=PRODUCT) d'origine visée
    lots: int = Field(..., gt=0, description="Nb de lots à facturer sur cette ligne (le front pré-calcule via boxes_per_lot, mais l'user peut ajuster)")


LotRevisionDirection = Literal["CREDIT", "SURCHARGE"]


class LotPriceRevisionRequest(BaseModel):
    amount_per_lot: Decimal = Field(..., gt=0, description="Montant par lot, toujours positif — le signe vient de `direction`")
    direction: LotRevisionDirection = Field(
        "CREDIT", description="CREDIT = rabais négocié après-coup (soustrait) ; SURCHARGE = supplément facturé (ajouté)",
    )
    reason: str = Field(..., min_length=1, max_length=500)
    lines: list[LotPriceRevisionLine] = Field(..., min_length=1)


class LossRevisionLine(BaseModel):
    item_id: int  # id de la ligne SaleItem (line_type=PRODUCT) d'origine visée
    units_lost: int = Field(..., gt=0, description="Nb d'unités (sacs) perdues, pas de caisses")
    reason: str = Field(..., min_length=1, max_length=500)


class LossRevisionRequest(BaseModel):
    lines: list[LossRevisionLine] = Field(..., min_length=1)


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
