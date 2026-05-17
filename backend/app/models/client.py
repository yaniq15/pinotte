from typing import Optional

from sqlalchemy import BigInteger, Boolean, Integer, String, Text
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
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
