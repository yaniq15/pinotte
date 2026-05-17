from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import batch as crud
from ...crud import product as product_crud
from ...models.batch import Batch
from ...models.user import User
from ...schemas.batch import BatchCreate, BatchRead, BatchUpdate
from ..deps import get_current_user

router = APIRouter(prefix="/batches", tags=["batches"])


def _to_read(batch: Batch) -> BatchRead:
    read = BatchRead.model_validate(batch)
    read.unit_cost = crud.compute_unit_cost(batch)
    if batch.product:
        read.product_name = batch.product.name
        read.product_sku = batch.product.sku
    return read


@router.get("", response_model=list[BatchRead])
def list_batches(
    product_id: Optional[int] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BatchRead]:
    return [_to_read(b) for b in crud.list_all(db, product_id=product_id)]


@router.post("", response_model=BatchRead, status_code=status.HTTP_201_CREATED)
def create_batch(
    payload: BatchCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BatchRead:
    product = product_crud.get_by_id(db, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Produit {payload.product_id} introuvable")
    try:
        batch = crud.create(db, payload, current)
    except IntegrityError as e:
        db.rollback()
        if "uq_batch_product_number" in str(e.orig):
            raise HTTPException(
                status_code=409,
                detail=f"Numéro de lot déjà utilisé pour ce produit : {payload.batch_number}",
            )
        raise HTTPException(status_code=400, detail=f"Création impossible : {e.orig}")
    db.refresh(batch)
    return _to_read(batch)


@router.get("/{batch_id}", response_model=BatchRead)
def get_batch(
    batch_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BatchRead:
    batch = crud.get_by_id(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    return _to_read(batch)


@router.patch("/{batch_id}", response_model=BatchRead)
def update_batch(
    batch_id: int,
    payload: BatchUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BatchRead:
    batch = crud.get_by_id(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    return _to_read(crud.update(db, batch, payload))


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(
    batch_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    batch = crud.get_by_id(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    crud.delete(db, batch)
