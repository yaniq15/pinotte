from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

EventStatus = Literal["PLANNED", "ONGOING", "DONE", "CANCELLED"]


class MaterialItem(BaseModel):
    """Une ligne d'achat matière pour un événement (achat au fur et à mesure)."""
    label: str = Field(..., min_length=1, max_length=200)
    amount: Decimal = Field(..., ge=0)
    # Lien optionnel vers le catalogue Matières premières (juste pour traçabilité).
    material_id: Optional[int] = None
    # Quantité achetée (dans l'unité de la matière liée). Toujours optionnelle.
    quantity: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=20)
    # Si True ET material_id + quantity fournis, créer aussi un MaterialPurchase
    # → met à jour stock catalogue + PMP. Une fois créé, purchase_id est stocké
    # pour ne pas recréer l'achat lors des updates ultérieurs.
    register_as_purchase: bool = False
    purchase_id: Optional[int] = None


class EventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    location: Optional[str] = Field(None, max_length=200)
    start_date: date
    end_date: Optional[date] = None
    status: EventStatus = "PLANNED"
    registration_fee: Decimal = Field(Decimal("0"), ge=0)
    transport_cost: Decimal = Field(Decimal("0"), ge=0)
    other_costs: Decimal = Field(Decimal("0"), ge=0)
    materials_cost: Decimal = Field(Decimal("0"), ge=0)
    materials_breakdown: Optional[list[MaterialItem]] = None
    total_revenue: Decimal = Field(Decimal("0"), ge=0)
    units_sold: int = Field(0, ge=0)
    notes: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    location: Optional[str] = Field(None, max_length=200)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[EventStatus] = None
    registration_fee: Optional[Decimal] = Field(None, ge=0)
    transport_cost: Optional[Decimal] = Field(None, ge=0)
    other_costs: Optional[Decimal] = Field(None, ge=0)
    materials_cost: Optional[Decimal] = Field(None, ge=0)
    materials_breakdown: Optional[list[MaterialItem]] = None
    total_revenue: Optional[Decimal] = Field(None, ge=0)
    units_sold: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    # Champs calculés (ROI)
    total_cost: Decimal = Decimal("0")
    profit: Decimal = Decimal("0")
    roi_pct: Optional[float] = None
