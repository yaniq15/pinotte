from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.batch import Batch
from ..models.movement import Movement
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
    """Create a batch AND its associated PRODUCTION stock movement in one
    transaction. Per Phase 3 spec — stock is never stored, it's the sum of
    movements, so a batch without its matching movement would be invisible to
    the inventory.

    Auto-consommation matières premières : si le produit a une recette qui
    référence des Material (matching par nom), on décrémente le stock en
    proportion du batch produit."""
    batch = Batch(**payload.model_dump(), created_by=created_by.id)
    db.add(batch)
    db.flush()  # need batch.id for the movement's reference_id
    db.add(Movement(
        product_id=batch.product_id,
        batch_id=batch.id,
        created_by=created_by.id,
        movement_type="PRODUCTION",
        quantity_boxes=batch.quantity_boxes,
        reference_type="batch",
        reference_id=batch.id,
        movement_date=batch.production_date,
        notes=f"Production lot {batch.batch_number}",
    ))

    # Auto-déduction des matières premières si la recette est liée
    from ..models.material import Material, MaterialMovement
    product = db.get(Product, batch.product_id)
    if product and product.batch_yield_units and product.ingredients:
        units_produced = batch.quantity_boxes * (product.units_per_box or 1)
        if product.batch_yield_units > 0:
            batches_factor = Decimal(units_produced) / Decimal(product.batch_yield_units)
            for ing in product.ingredients:
                # Skip lignes auto (emballage, main d'œuvre) qui ne sont pas des matières premières
                if ing.name.startswith("[Auto]"):
                    continue
                material = db.scalar(select(Material).where(Material.name == ing.name))
                if not material:
                    continue
                qty_consumed = (Decimal(ing.quantity) * batches_factor).quantize(Decimal("0.0001"))
                db.add(MaterialMovement(
                    material_id=material.id,
                    created_by=created_by.id,
                    movement_type="CONSUMPTION",
                    quantity=-qty_consumed,
                    batch_id=batch.id,
                    movement_date=batch.production_date,
                    notes=f"Consommé pour lot {batch.batch_number}",
                ))
                material.current_stock = Decimal(material.current_stock) - qty_consumed

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
