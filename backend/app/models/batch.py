from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base, TimestampMixin


class Batch(Base, TimestampMixin):
    __tablename__ = "batches"
    __table_args__ = (
        UniqueConstraint("product_id", "batch_number", name="uq_batch_product_number"),
        CheckConstraint("quantity_boxes > 0", name="ck_quantity_boxes_positive"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    batch_number: Mapped[str] = mapped_column(String(50), nullable=False)
    production_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    quantity_boxes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    product = relationship("Product", lazy="joined")
