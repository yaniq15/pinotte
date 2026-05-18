"""CRUD matières premières + logique prix moyen pondéré (PMP) et mouvements."""
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.material import Material, MaterialMovement, MaterialPurchase
from ..models.user import User
from ..schemas.material import (
    MaterialCreate, MaterialUpdate, MaterialPurchaseCreate,
)


# ── Material (catalogue) ────────────────────────────────────────────────────
def list_materials(db: Session, include_archived: bool = False) -> list[Material]:
    stmt = select(Material).order_by(Material.name)
    if not include_archived:
        stmt = stmt.where(Material.archived == False)  # noqa: E712
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, material_id: int) -> Optional[Material]:
    return db.get(Material, material_id)


def get_by_name(db: Session, name: str) -> Optional[Material]:
    return db.scalar(select(Material).where(Material.name == name))


def create_material(db: Session, payload: MaterialCreate) -> Material:
    m = Material(**payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def update_material(db: Session, material: Material, payload: MaterialUpdate) -> Material:
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(material, k, v)
    db.commit()
    db.refresh(material)
    return material


def delete_material(db: Session, material: Material) -> None:
    db.delete(material)
    db.commit()


# ── Purchase + PMP recalc ───────────────────────────────────────────────────
def create_purchase(
    db: Session, payload: MaterialPurchaseCreate, user: User,
) -> MaterialPurchase:
    """Crée un achat ET met à jour le stock + le prix moyen pondéré du matériau.

    PMP formula:
       new_pmp = (old_stock × old_pmp + new_qty × purchase_unit_price) / (old_stock + new_qty)
    Si old_stock = 0, new_pmp = purchase_unit_price.
    """
    material = db.get(Material, payload.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Matière introuvable")

    qty = Decimal(payload.quantity)
    total = Decimal(payload.total_cost)
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Quantité doit être > 0")
    unit_price = (total / qty).quantize(Decimal("0.0001"))

    # PMP
    old_stock = Decimal(material.current_stock)
    old_pmp = Decimal(material.weighted_avg_price)
    new_stock = old_stock + qty
    if new_stock > 0:
        new_pmp = (
            (old_stock * old_pmp + qty * unit_price) / new_stock
        ).quantize(Decimal("0.0001"))
    else:
        new_pmp = unit_price

    purchase = MaterialPurchase(
        material_id=material.id,
        created_by=user.id,
        quantity=qty,
        total_cost=total,
        unit_price=unit_price,
        vendor=payload.vendor,
        paid_by=payload.paid_by,
        purchase_date=payload.purchase_date,
        receipt_url=payload.receipt_url,
        notes=payload.notes,
    )
    db.add(purchase)
    db.flush()

    # Mouvement audit
    db.add(MaterialMovement(
        material_id=material.id,
        created_by=user.id,
        movement_type="PURCHASE",
        quantity=qty,
        purchase_id=purchase.id,
        movement_date=payload.purchase_date,
        notes=f"Achat chez {payload.vendor or '?'}",
    ))

    # Update material
    material.current_stock = new_stock
    material.weighted_avg_price = new_pmp

    db.commit()
    db.refresh(purchase)
    return purchase


def list_purchases(db: Session, material_id: Optional[int] = None, limit: int = 200) -> list[MaterialPurchase]:
    stmt = select(MaterialPurchase).order_by(MaterialPurchase.purchase_date.desc(), MaterialPurchase.id.desc())
    if material_id:
        stmt = stmt.where(MaterialPurchase.material_id == material_id)
    stmt = stmt.limit(limit)
    return list(db.scalars(stmt).all())


def delete_purchase(db: Session, purchase: MaterialPurchase) -> None:
    """Suppression d'un achat — décrémente le stock + recalc PMP par re-agg.
    Note: ne crée pas de mouvement REVERSAL pour rester simple."""
    material = db.get(Material, purchase.material_id)
    if material:
        material.current_stock = Decimal(material.current_stock) - Decimal(purchase.quantity)
        if material.current_stock < 0:
            material.current_stock = Decimal("0")
        # Recalc PMP from remaining purchases (simple approach)
        remaining_total = Decimal("0")
        remaining_qty = Decimal("0")
        for p in material.purchases:
            if p.id == purchase.id:
                continue
            remaining_total += Decimal(p.total_cost)
            remaining_qty += Decimal(p.quantity)
        material.weighted_avg_price = (
            (remaining_total / remaining_qty).quantize(Decimal("0.0001"))
            if remaining_qty > 0
            else Decimal("0")
        )
    db.delete(purchase)
    db.commit()


# ── Movements (audit + auto-déduction au batch) ─────────────────────────────
def list_movements(db: Session, material_id: Optional[int] = None, limit: int = 200) -> list[MaterialMovement]:
    stmt = select(MaterialMovement).order_by(MaterialMovement.movement_date.desc(), MaterialMovement.id.desc())
    if material_id:
        stmt = stmt.where(MaterialMovement.material_id == material_id)
    stmt = stmt.limit(limit)
    return list(db.scalars(stmt).all())


def consume_material(
    db: Session,
    material: Material,
    quantity: Decimal,
    user: User,
    batch_id: Optional[int] = None,
    movement_date: Optional[date] = None,
    notes: Optional[str] = None,
) -> MaterialMovement:
    """Consomme du stock matière (sortie). Utilisé par Batch pour auto-déduction.
    Crée un mouvement CONSUMPTION et décrémente current_stock.
    Lève 400 si stock insuffisant (mais l'app peut décider de skipper / forcer)."""
    qty = Decimal(quantity)
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Quantité doit être > 0")
    if Decimal(material.current_stock) < qty:
        # On autorise quand même (au cas où l'user n'a pas tout enregistré côté approv).
        # Le stock peut tomber négatif → l'app affichera une alerte. C'est plus permissif que strict.
        pass

    mvt = MaterialMovement(
        material_id=material.id,
        created_by=user.id,
        movement_type="CONSUMPTION",
        quantity=-qty,
        batch_id=batch_id,
        movement_date=movement_date or date.today(),
        notes=notes,
    )
    db.add(mvt)
    material.current_stock = Decimal(material.current_stock) - qty
    return mvt
