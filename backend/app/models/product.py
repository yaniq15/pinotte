from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Boolean, CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base, TimestampMixin


class Product(Base, TimestampMixin):
    """Chika product with full pricing structure.

    Pricing chain (per Chika's real spreadsheet):
      consumer_price (PDS)
        → minus store_margin (35%) = prix_coutant_magasin  →  price_direct
        → minus distribution_rate (18%/19%, set per BROKER client)
                                                            = cost_net_distributeur  →  price_broker

    Recipe cost (Phase 8):
      `batch_yield_units` × `units_per_box` together with `ingredients` allow
      computing the production cost per unit (= sum of ingredient line costs /
      batch_yield_units). When the user "applies" the computed cost, it is
      written to `unit_cost`.
    """
    __tablename__ = "products"
    __table_args__ = (CheckConstraint("units_per_box > 0", name="ck_units_per_box_positive"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    units_per_box: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)

    # Recipe yield: how many units (jars/bags) does ONE reference batch produce.
    batch_yield_units: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Suggested consumer price (Prix de vente consommateur — PDS)
    consumer_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    store_margin_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)

    price_broker: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    price_direct: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)

    currency: Mapped[str] = mapped_column(String(3), default="CAD", nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # Code GS1 — GTIN-13/14 numérique. Pinotte génère le code-barres EAN-13.
    gtin: Mapped[Optional[str]] = mapped_column(String(14), nullable=True)
    # Image de code-barres uploadée — alternative au GTIN généré.
    barcode_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # Au Québec, l'épicerie de base (légumes, viande, sauces alimentaires...)
    # est DÉTAXÉE. taxable=False → pas de TPS/TVQ sur ce produit en vente.
    taxable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")

    ingredients = relationship(
        "ProductIngredient",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductIngredient.sort_order",
        lazy="selectin",
    )


class ProductIngredient(Base, TimestampMixin):
    """One ingredient line in a product's recipe — quantity for ONE batch.

    `material_id` (nullable) lie la ligne au catalogue Matières premières.
    Si renseigné, la consommation lors d'un batch décrémente le stock du matériau.
    Si NULL → ligne "auto" (emballage, main d'œuvre…) qui ne touche pas le stock.
    """
    __tablename__ = "product_ingredients"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("materials.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    # Free-form unit label: 'g', 'kg', 'ml', 'L', 'unité', 'oz' … — we don't
    # try to normalise units server-side; the user enters the quantity AND
    # the unit_price in the same unit, so the math is unit-agnostic.
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="g")
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 6), nullable=True,
        comment="Price per ONE unit (whatever the unit is — $/g, $/ml, etc.)")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product = relationship("Product", back_populates="ingredients")
    material = relationship("Material", lazy="joined")
