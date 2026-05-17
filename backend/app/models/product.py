from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base, TimestampMixin


class Product(Base, TimestampMixin):
    """Chika product with full pricing structure.

    Pricing chain (per Chika's real spreadsheet):
      consumer_price (PDS)
        → minus store_margin (35%) = prix_coutant_magasin  →  price_direct
        → minus distribution_rate (18%/19%, set per BROKER client)
                                                            = cost_net_distributeur  →  price_broker
    """
    __tablename__ = "products"
    __table_args__ = (CheckConstraint("units_per_box > 0", name="ck_units_per_box_positive"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    units_per_box: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)

    # Suggested consumer price (Prix de vente consommateur — PDS)
    consumer_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    # Store margin %, e.g. 0.35 for 35%
    store_margin_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)

    # Cached/computed prices per channel (kept for fast queries + override possibility):
    #   price_direct = consumer_price × (1 − store_margin_pct)
    #   price_broker = price_direct × (1 − client.distribution_rate_pct)
    # When a sale is created, the actual unit_price comes from the client's distribution
    # rate (BROKER) or price_direct (STORE), unless overridden manually in the UI.
    price_broker: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    price_direct: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)

    currency: Mapped[str] = mapped_column(String(3), default="CAD", nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
