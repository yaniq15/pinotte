from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import product as product_crud
from ...crud import recipe as crud
from ...models.user import User
from ...schemas.recipe import RecipeOut, RecipePut
from ..deps import get_current_user

router = APIRouter(prefix="/products", tags=["recipes"])


@router.get("/{product_id}/recipe", response_model=RecipeOut)
def get_recipe(
    product_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeOut:
    p = product_crud.get_by_id(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return crud.get_recipe(db, p)


@router.put("/{product_id}/recipe", response_model=RecipeOut)
def put_recipe(
    product_id: int,
    payload: RecipePut,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeOut:
    p = product_crud.get_by_id(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    crud.put_recipe(db, p, payload)
    return crud.get_recipe(db, p)


@router.post("/{product_id}/recipe/apply-cost", response_model=RecipeOut)
def apply_cost(
    product_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecipeOut:
    """Recompute cost-per-unit from the recipe and write it to product.unit_cost."""
    p = product_crud.get_by_id(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    try:
        crud.apply_cost(db, p)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return crud.get_recipe(db, p)
