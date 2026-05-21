"""Modèles spécifiques aux features PME finance avancées :
- CashSnapshot : solde bancaire saisi périodiquement (1×/mois recommandé)
- InventoryCount : compte physique produits finis, génère l'écart
- FixedAsset : immobilisations corporelles avec amortissement CCA
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base


class CashSnapshot(Base):
    """Snapshot du solde bancaire à une date donnée. L'user saisit ça
    manuellement chaque début de mois. Sert au calcul du runway et de la
    burn rate."""
    __tablename__ = "cash_snapshots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True, unique=True)
    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class InventoryCount(Base):
    """Compte physique d'un produit à une date donnée. La différence avec le
    stock théorique génère un mouvement ADJUSTMENT côté table movements
    (créé manuellement par l'endpoint, pas trigger SQL)."""
    __tablename__ = "inventory_counts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    count_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    physical_qty_boxes: Mapped[int] = mapped_column(Integer, nullable=False)
    theoretical_qty_boxes: Mapped[int] = mapped_column(Integer, nullable=False)
    delta_boxes: Mapped[int] = mapped_column(Integer, nullable=False)  # physical - theoretical
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    product = relationship("Product", lazy="joined")


class FixedAsset(Base):
    """Immobilisation corporelle (équipement, véhicule, ordi) avec amortissement
    fiscal CCA (Déduction Pour Amortissement Canada). Tableau standalone car le
    chiffre annuel d'amortissement est calculé dynamiquement, pas stocké."""
    __tablename__ = "fixed_assets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    cca_class: Mapped[str] = mapped_column(String(5), nullable=False)  # 8, 10, 50…
    cca_rate_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    accumulated_depreciation: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    disposal_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
