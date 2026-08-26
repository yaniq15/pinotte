from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import client as client_crud
from ...crud import sale as crud
from ...models.sale import Sale
from ...models.user import User
from ...schemas.sale import (
    LossRevisionRequest, LotPriceRevisionRequest, SaleCreate, SaleItemRead, SaleRead, SaleStatusUpdate,
)
from ..deps import get_current_user

router = APIRouter(prefix="/sales", tags=["sales"])


def _to_read(sale: Sale) -> SaleRead:
    out = SaleRead.model_validate(sale)
    if sale.client:
        out.client_name = sale.client.name
        out.client_type = sale.client.type
    out.items = []
    for it in sale.items:
        item_read = SaleItemRead.model_validate(it)
        if it.product:
            item_read.product_name = it.product.name
            item_read.product_sku = it.product.sku
            item_read.product_taxable = bool(it.product.taxable)
        out.items.append(item_read)
    return out


@router.get("", response_model=list[SaleRead])
def list_sales(
    client_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SaleRead]:
    return [
        _to_read(s) for s in crud.list_sales(
            db, client_id=client_id, status=status, date_from=date_from, date_to=date_to,
        )
    ]


@router.post("", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SaleRead:
    if not client_crud.get_by_id(db, payload.client_id):
        raise HTTPException(status_code=404, detail=f"Client {payload.client_id} introuvable")
    sale = crud.create(db, payload, current)
    return _to_read(sale)


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(
    sale_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SaleRead:
    sale = crud.get_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Vente introuvable")
    return _to_read(sale)


@router.patch("/{sale_id}/status", response_model=SaleRead)
def change_status(
    sale_id: int,
    payload: SaleStatusUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SaleRead:
    sale = crud.get_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Vente introuvable")
    return _to_read(crud.transition_status(db, sale, payload.status, payload.payment_date, current))


@router.post("/{sale_id}/revise/lot-price", response_model=SaleRead)
def revise_lot_price(
    sale_id: int,
    payload: LotPriceRevisionRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SaleRead:
    """Applique une correction de prix ($/lot) sur des lignes déjà facturées
    — ex. le client demande d'appliquer 5$ de plus par lot déjà fourni."""
    sale = crud.get_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Vente introuvable")
    return _to_read(crud.apply_lot_price_revision(
        db, sale, payload.lines, payload.amount_per_lot, payload.reason, current,
    ))


@router.post("/{sale_id}/revise/loss", response_model=SaleRead)
def revise_loss(
    sale_id: int,
    payload: LossRevisionRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SaleRead:
    """Crédite une perte de produit déclarée après coup sur une facture déjà
    émise. Ne touche pas le stock — si la perte n'est pas encore déclarée
    côté inventaire, il faut aussi passer par Mouvements (LOSS)."""
    sale = crud.get_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Vente introuvable")
    return _to_read(crud.apply_loss_revision(db, sale, payload.lines, current))
