from datetime import date
from typing import Optional

from sqlalchemy import BigInteger, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base, TimestampMixin

# Allowed movement_type values — validated at the schema layer.
MOVEMENT_TYPES = ("PRODUCTION", "SALE", "LOSS", "ADJUSTMENT", "RETURN")


class Movement(Base, TimestampMixin):
    """Single-row append-only stock movement.

    Current stock = SUM(quantity_boxes) per product. We never store the stock
    directly — only the movements. `quantity_boxes` is signed: positive for
    incoming (PRODUCTION, RETURN, positive ADJUSTMENT), negative for outgoing
    (SALE, LOSS, negative ADJUSTMENT).
    """
    __tablename__ = "movements"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    batch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("batches.id"), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    quantity_boxes: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    reference_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    movement_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    product = relationship("Product", lazy="joined")
