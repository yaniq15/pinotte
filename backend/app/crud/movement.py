from datetime import date
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.batch import Batch
from ..models.movement import Movement
from ..models.product import Product
from ..models.user import User

# Hard-coded low-stock threshold (Phase 3) — Phase 7 may move this to per-product config
LOW_STOCK_THRESHOLD_BOXES = 10


def list_movements(
    db: Session,
    *,
    product_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 500,
) -> list[Movement]:
    stmt = select(Movement).order_by(Movement.movement_date.desc(), Movement.id.desc()).limit(limit)
    if product_id is not None:
        stmt = stmt.where(Movement.product_id == product_id)
    if movement_type:
        stmt = stmt.where(Movement.movement_type == movement_type)
    if date_from:
        stmt = stmt.where(Movement.movement_date >= date_from)
    if date_to:
        stmt = stmt.where(Movement.movement_date <= date_to)
    return list(db.scalars(stmt).all())


def create_production_for_batch(db: Session, batch: Batch, created_by: User) -> Movement:
    """Auto-create the PRODUCTION movement that mirrors a newly-created batch.
    Same caller is expected to handle the transaction (we do not commit here)."""
    m = Movement(
        product_id=batch.product_id,
        batch_id=batch.id,
        created_by=created_by.id,
        movement_type="PRODUCTION",
        quantity_boxes=batch.quantity_boxes,  # positive
        reference_type="batch",
        reference_id=batch.id,
        movement_date=batch.production_date,
        notes=f"Production lot {batch.batch_number}",
    )
    db.add(m)
    return m


def create_manual(db: Session, payload: dict, created_by: User) -> Movement:
    m = Movement(
        product_id=payload["product_id"],
        batch_id=payload.get("batch_id"),
        created_by=created_by.id,
        movement_type=payload["movement_type"],
        quantity_boxes=payload["quantity_boxes"],
        reference_type="manual",
        reference_id=None,
        movement_date=payload["movement_date"],
        notes=payload.get("notes"),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def current_stock_by_product(db: Session) -> dict[int, int]:
    """Return {product_id: sum_of_quantity_boxes}."""
    rows = db.execute(
        select(Movement.product_id, func.coalesce(func.sum(Movement.quantity_boxes), 0))
        .group_by(Movement.product_id)
    ).all()
    return {pid: int(qty) for pid, qty in rows}


def backfill_production_for_existing_batches(db: Session, fallback_user_id: int) -> int:
    """One-time idempotent backfill: any batch that does not already have a
    PRODUCTION movement linked to it gets one. Returns the number of movements
    created. Used at app boot so Phase 2 batches created before Phase 3
    deployment still appear in the inventory."""
    # Find batches without a PRODUCTION movement
    sub = (
        select(Movement.batch_id)
        .where(Movement.movement_type == "PRODUCTION", Movement.batch_id.is_not(None))
    )
    missing = list(db.scalars(select(Batch).where(Batch.id.notin_(sub))).all())
    created = 0
    for b in missing:
        db.add(Movement(
            product_id=b.product_id,
            batch_id=b.id,
            created_by=b.created_by or fallback_user_id,
            movement_type="PRODUCTION",
            quantity_boxes=b.quantity_boxes,
            reference_type="batch",
            reference_id=b.id,
            movement_date=b.production_date,
            notes=f"[backfill] Production lot {b.batch_number}",
        ))
        created += 1
    if created:
        db.commit()
    return created
