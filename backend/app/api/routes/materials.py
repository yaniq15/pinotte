"""Routes Matières premières + Approvisionnements + Mouvements."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import material as crud
from ...models.user import User
from ...schemas.material import (
    MaterialCreate, MaterialUpdate, MaterialRead,
    MaterialPurchaseCreate, MaterialPurchaseRead,
    MaterialMovementRead,
)
from ..deps import get_current_user

router = APIRouter(prefix="/materials", tags=["materials"])


def _material_read(m) -> MaterialRead:
    return MaterialRead.model_validate(m)


def _purchase_read(p) -> MaterialPurchaseRead:
    out = MaterialPurchaseRead.model_validate(p)
    if p.material:
        out.material_name = p.material.name
        out.material_unit = p.material.unit
    return out


def _movement_read(m) -> MaterialMovementRead:
    out = MaterialMovementRead.model_validate(m)
    if m.material:
        out.material_name = m.material.name
    return out


# ── Materials ───────────────────────────────────────────────────────────────
@router.get("", response_model=list[MaterialRead])
def list_materials(
    include_archived: bool = False,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MaterialRead]:
    return [_material_read(m) for m in crud.list_materials(db, include_archived=include_archived)]


@router.post("", response_model=MaterialRead, status_code=status.HTTP_201_CREATED)
def create_material(
    payload: MaterialCreate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialRead:
    if crud.get_by_name(db, payload.name):
        raise HTTPException(status_code=409, detail=f"Matière déjà existante : {payload.name}")
    return _material_read(crud.create_material(db, payload))


@router.patch("/{material_id}", response_model=MaterialRead)
def update_material(
    material_id: int,
    payload: MaterialUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialRead:
    m = crud.get_by_id(db, material_id)
    if not m:
        raise HTTPException(status_code=404, detail="Matière introuvable")
    return _material_read(crud.update_material(db, m, payload))


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    m = crud.get_by_id(db, material_id)
    if not m:
        raise HTTPException(status_code=404, detail="Matière introuvable")
    crud.delete_material(db, m)


# ── Purchases (approvisionnements) ──────────────────────────────────────────
@router.get("/purchases", response_model=list[MaterialPurchaseRead])
def list_purchases(
    material_id: Optional[int] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MaterialPurchaseRead]:
    return [_purchase_read(p) for p in crud.list_purchases(db, material_id=material_id)]


@router.post("/purchases", response_model=MaterialPurchaseRead, status_code=status.HTTP_201_CREATED)
def create_purchase(
    payload: MaterialPurchaseCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialPurchaseRead:
    return _purchase_read(crud.create_purchase(db, payload, current))


@router.delete("/purchases/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(
    purchase_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    from ...models.material import MaterialPurchase
    p = db.get(MaterialPurchase, purchase_id)
    if not p:
        raise HTTPException(status_code=404, detail="Achat introuvable")
    crud.delete_purchase(db, p)


# ── Movements (audit / historique) ──────────────────────────────────────────
@router.get("/movements", response_model=list[MaterialMovementRead])
def list_movements(
    material_id: Optional[int] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MaterialMovementRead]:
    return [_movement_read(m) for m in crud.list_movements(db, material_id=material_id)]
