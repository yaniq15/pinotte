from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import movement as crud
from ...crud import product as product_crud
from ...models.movement import Movement
from ...models.user import User
from ...schemas.movement import MovementCreate, MovementRead
from ..deps import get_current_user

router = APIRouter(prefix="/movements", tags=["movements"])


def _to_read(m: Movement) -> MovementRead:
    out = MovementRead.model_validate(m)
    if m.product:
        out.product_name = m.product.name
        out.product_sku = m.product.sku
    return out


@router.get("", response_model=list[MovementRead])
def list_movements(
    product_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 500,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MovementRead]:
    movements = crud.list_movements(
        db,
        product_id=product_id,
        movement_type=movement_type,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    return [_to_read(m) for m in movements]


@router.post("", response_model=MovementRead, status_code=status.HTTP_201_CREATED)
def create_movement(
    payload: MovementCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MovementRead:
    # Validation : LOSS must be negative.
    if payload.movement_type == "LOSS" and payload.quantity_boxes > 0:
        raise HTTPException(
            status_code=400,
            detail="Une perte (LOSS) doit avoir une quantité négative (ex: -5)",
        )
    if not product_crud.get_by_id(db, payload.product_id):
        raise HTTPException(status_code=404, detail=f"Produit {payload.product_id} introuvable")
    m = crud.create_manual(db, payload.model_dump(), current)
    return _to_read(m)
