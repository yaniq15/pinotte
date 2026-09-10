from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SaleStatus = Literal["PENDING", "DELIVERED", "PAID", "CANCELLED"]
SaleItemLineType = Literal["PRODUCT", "LOT_ADJUSTMENT", "LOSS_ADJUSTMENT", "MANUAL"]


class SaleItemCreate(BaseModel):
    # Ligne produit : product_id renseigné (vérif stock + mouvement).
    # Ligne manuelle : description renseignée, product_id NULL (aucun stock).
    product_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=300)
    taxable: bool = False  # utilisé uniquement pour une ligne manuelle
    quantity_boxes: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    batch_id: Optional[int] = None

    @model_validator(mode="after")
    def _one_of_product_or_description(self) -> "SaleItemCreate":
        has_product = self.product_id is not None
        has_desc = bool(self.description and self.description.strip())
        if has_product == has_desc:
            raise ValueError("Chaque ligne doit avoir SOIT un produit SOIT une description manuelle (pas les deux, pas aucun).")
        return self


class SaleItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: Optional[int] = None
    batch_id: Optional[int]
    quantity_boxes: int
    unit_price: Decimal
    subtotal: Decimal
    line_type: SaleItemLineType = "PRODUCT"
    description: Optional[str] = None  # libellé d'une ligne manuelle
    notes: Optional[str] = None
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_taxable: bool = False  # remonté depuis Product pour calcul TPS/TVQ par ligne
    taxable: bool = False  # taxable EFFECTIF résolu côté serveur (produit ou ligne manuelle)
    product_units_per_box: Optional[int] = None  # remonté depuis Product pour révision de perte par unité

    @field_validator("taxable", mode="before")
    @classmethod
    def _taxable_none_is_false(cls, v: object) -> object:
        # sale_items.taxable est NULL sur toutes les lignes non-manuelles
        # (lignes produit + révisions) — on le lit comme False, la vraie
        # valeur étant ensuite résolue depuis le produit dans _to_read().
        return False if v is None else v


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
