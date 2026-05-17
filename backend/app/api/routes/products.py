from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import product as crud
from ...models.user import User
from ...schemas.product import ProductCreate, ProductRead, ProductUpdate
from ..deps import get_current_user, require_roles

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
def list_products(
    include_inactive: bool = True,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProductRead]:
    return [ProductRead.model_validate(p) for p in crud.list_all(db, include_inactive=include_inactive)]


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductRead:
    if crud.get_by_sku(db, payload.sku):
        raise HTTPException(status_code=409, detail=f"SKU déjà utilisé : {payload.sku}")
    try:
        product = crud.create(db, payload)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Création impossible : {e.orig}")
    return ProductRead.model_validate(product)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return ProductRead.model_validate(product)


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    if payload.sku and payload.sku != product.sku and crud.get_by_sku(db, payload.sku):
        raise HTTPException(status_code=409, detail=f"SKU déjà utilisé : {payload.sku}")
    return ProductRead.model_validate(crud.update(db, product, payload))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    _: User = Depends(require_roles("OWNER")),
    db: Session = Depends(get_db),
) -> None:
    product = crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    try:
        crud.delete(db, product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Produit lié à des lots — désactive-le plutôt que de le supprimer",
        )
