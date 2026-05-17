from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.batch import Batch
from ..models.product import Product
from ..models.user import User
from ..schemas.batch import BatchCreate, BatchUpdate


def list_all(db: Session, product_id: Optional[int] = None) -> list[Batch]:
    stmt = select(Batch).order_by(Batch.production_date.desc(), Batch.id.desc())
    if product_id is not None:
        stmt = stmt.where(Batch.product_id == product_id)
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, batch_id: int) -> Optional[Batch]:
    return db.get(Batch, batch_id)


def create(db: Session, payload: BatchCreate, created_by: User) -> Batch:
    batch = Batch(**payload.model_dump(), created_by=created_by.id)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


def update(db: Session, batch: Batch, payload: BatchUpdate) -> Batch:
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(batch, k, v)
    db.commit()
    db.refresh(batch)
    return batch


def delete(db: Session, batch: Batch) -> None:
    db.delete(batch)
    db.commit()


def compute_unit_cost(batch: Batch) -> Optional[Decimal]:
    """Per-UNIT production cost = total_cost / (quantity_boxes * product.units_per_box)."""
    if not batch.product or not batch.product.units_per_box:
        return None
    units = batch.quantity_boxes * batch.product.units_per_box
    if units == 0:
        return None
    return (batch.total_cost / Decimal(units)).quantize(Decimal("0.0001"))
