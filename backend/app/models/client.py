from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base, TimestampMixin

CLIENT_TYPES = ("BROKER", "STORE")


class Client(Base, TimestampMixin):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payment_terms_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    # Distribution rate for BROKER clients (e.g., 0.18 for 18%). Ignored for STORE.
    # When set, Chika's net price per unit = price_direct × (1 − distribution_rate_pct).
    distribution_rate_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
