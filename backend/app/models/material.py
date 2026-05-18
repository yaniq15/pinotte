"""Matières premières — ingrédients en stock pour la production.

Distinct des Products (produits finis vendus).
Chaque Material a un stock courant + un prix moyen pondéré (PMP) recalculé
à chaque approvisionnement, pour refléter la réalité comptable.
"""
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base, TimestampMixin


class Material(Base, TimestampMixin):
    """Une matière première (ex: Cajou cru, Chanvre, Sachet sous vide 200g…)."""
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # ex: 'kg', 'g', 'ml', 'L', 'unité'
    # Stock en cours (somme des achats - somme des consommations + ajustements)
    current_stock: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=Decimal("0"))
    # Prix moyen pondéré (PMP) : recalculé à chaque achat = (stock × ancien_PMP + nouveau_qty × prix_achat) / (stock + nouveau_qty)
    weighted_avg_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False, default=Decimal("0"))
    # Seuil pour alerte stock bas (optionnel)
    low_stock_threshold: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 3), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    archived: Mapped[bool] = mapped_column(default=False, nullable=False)

    purchases = relationship("MaterialPurchase", back_populates="material", cascade="all, delete-orphan", lazy="select")
    movements = relationship("MaterialMovement", back_populates="material", cascade="all, delete-orphan", lazy="select")


class MaterialPurchase(Base, TimestampMixin):
    """Un achat d'approvisionnement (ex: 5 kg cajou chez Costco pour 300 $)."""
    __tablename__ = "material_purchases"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)  # = total_cost / quantity
    vendor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    paid_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    material = relationship("Material", back_populates="purchases", lazy="joined")


class MaterialMovement(Base, TimestampMixin):
    """Mouvement de stock matière (achat, consommation batch, perte, ajustement)."""
    __tablename__ = "material_movements"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)  # PURCHASE | CONSUMPTION | LOSS | ADJUSTMENT
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)  # positif = entrée, négatif = sortie
    batch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    purchase_id: Mapped[Optional[int]] = mapped_column(ForeignKey("material_purchases.id", ondelete="SET NULL"), nullable=True)
    movement_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    material = relationship("Material", back_populates="movements", lazy="joined")
