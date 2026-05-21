"""Schemas Pydantic pour les features PME finance avancées."""
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Cash snapshots ──────────────────────────────────────────────
class CashSnapshotCreate(BaseModel):
    snapshot_date: date
    balance: Decimal = Field(..., ge=0)
    notes: Optional[str] = None


class CashSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    snapshot_date: date
    balance: Decimal
    notes: Optional[str] = None
    created_at: datetime


# ── Inventory counts ────────────────────────────────────────────
class InventoryCountCreate(BaseModel):
    """Saisie d'un compte physique. L'app calcule le delta + crée le mouvement ADJUSTMENT."""
    product_id: int
    count_date: date
    physical_qty_boxes: int = Field(..., ge=0)
    notes: Optional[str] = None


class InventoryCountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_name: Optional[str] = None
    count_date: date
    physical_qty_boxes: int
    theoretical_qty_boxes: int
    delta_boxes: int
    notes: Optional[str] = None
    created_at: datetime


# ── Fixed assets (immobilisations + DPA) ────────────────────────
class FixedAssetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    purchase_date: date
    cost: Decimal = Field(..., gt=0)
    cca_class: str = Field(..., max_length=5)
    cca_rate_pct: Decimal = Field(..., gt=0, le=100)
    notes: Optional[str] = None


class FixedAssetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    disposal_date: Optional[date] = None
    notes: Optional[str] = None


class FixedAssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    purchase_date: date
    cost: Decimal
    cca_class: str
    cca_rate_pct: Decimal
    accumulated_depreciation: Decimal
    disposal_date: Optional[date] = None
    notes: Optional[str] = None
    # Computed
    book_value: Decimal = Decimal("0")  # cost - accumulated_depreciation
    annual_depreciation_estimate: Decimal = Decimal("0")  # cca_rate × undepreciated balance


# ── Reports PME : AR aging, runway, alerts, etc. ────────────────
class ARAgingBucket(BaseModel):
    days_0_30: Decimal = Decimal("0")
    days_31_60: Decimal = Decimal("0")
    days_61_90: Decimal = Decimal("0")
    days_90_plus: Decimal = Decimal("0")
    total: Decimal = Decimal("0")


class ARAgingByClient(ARAgingBucket):
    client_id: int
    client_name: str
    client_type: str
    invoice_count: int = 0


class ARAgingReport(BaseModel):
    as_of_date: date
    totals: ARAgingBucket
    by_client: list[ARAgingByClient]
    dso_days: Optional[float] = None  # Days Sales Outstanding moyen sur 90j


class GrossMarginPoint(BaseModel):
    year: int
    month: int
    revenue_paid: Decimal
    cogs: Decimal
    gross_margin: Decimal
    gross_margin_pct: Optional[float] = None


class CashRunwayReport(BaseModel):
    cash_balance: Optional[Decimal] = None
    cash_balance_date: Optional[date] = None
    avg_monthly_burn: Optional[Decimal] = None  # (expenses - revenue_paid) moyenne 3 mois
    runway_months: Optional[float] = None
    status: Literal["healthy", "warning", "critical", "no_data"] = "no_data"


class ConcentrationRisk(BaseModel):
    entity_id: int
    entity_name: str
    entity_type: str  # "client" | "vendor"
    total_amount: Decimal
    pct_of_total: float
    is_risky: bool  # True si > 30%


class ConcentrationReport(BaseModel):
    period_months: int
    top_clients: list[ConcentrationRisk]
    top_vendors: list[ConcentrationRisk]


class AlertItem(BaseModel):
    severity: Literal["info", "warning", "critical"]
    category: str  # "ar_aging", "runway", "margin", "concentration", "subscription", "inventory"
    title: str
    description: str
    action_label: Optional[str] = None
    action_url: Optional[str] = None  # ex: "/comptes-a-recevoir"


class AlertsReport(BaseModel):
    generated_at: datetime
    alerts: list[AlertItem]
