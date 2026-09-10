from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Date, ForeignKey, Integer, Numeric, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base, TimestampMixin

SALE_STATUSES = ("PENDING", "DELIVERED", "PAID", "CANCELLED")

# PRODUCT = ligne vendue normalement (créée avec la vente).
# LOT_ADJUSTMENT = révision de prix par lot déjà fourni (quantity_boxes = nb
#   de LOTS, pas de caisses ; unit_price = montant $/lot).
# LOSS_ADJUSTMENT = crédit pour perte déclarée sur une ligne déjà facturée
#   (quantity_boxes = nb d'UNITÉS perdues, pas de caisses ; unit_price =
#   prix/unité au prorata du prix caisse ; subtotal négatif).
# MANUAL = ligne saisie à la main, sans produit du catalogue (product_id NULL ;
#   description = libellé libre ; taxable = case cochée sur la ligne ; aucun
#   mouvement de stock). Sert à facturer un service, un frais, un lot hors
#   catalogue…
SALE_ITEM_LINE_TYPES = ("PRODUCT", "LOT_ADJUSTMENT", "LOSS_ADJUSTMENT", "MANUAL")

# Valid status transitions (server-enforced)
STATUS_TRANSITIONS: dict[str, set[str]] = {
    "PENDING":   {"DELIVERED", "CANCELLED"},
    "DELIVERED": {"PAID", "CANCELLED"},
    "PAID":      set(),       # final
    "CANCELLED": set(),       # final
}


class Sale(Base, TimestampMixin):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False, index=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="CAD", nullable=False)
    payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    client = relationship("Client", lazy="joined")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan", lazy="joined")


class SaleItem(Base, TimestampMixin):
    __tablename__ = "sale_items"
    __table_args__ = (CheckConstraint("quantity_boxes > 0", name="ck_sale_item_qty_positive"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    # NULL pour une ligne MANUAL (facture sans produit du catalogue).
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id"), nullable=True)
    batch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("batches.id"), nullable=True)
    quantity_boxes: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_type: Mapped[str] = mapped_column(String(20), default="PRODUCT", server_default="PRODUCT", nullable=False)
    # Libellé libre — uniquement pour line_type=MANUAL.
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Taxable — uniquement pour line_type=MANUAL (les lignes produit lisent
    # products.taxable). NULL pour les autres line_types.
    taxable: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", lazy="joined")
