from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import expense as crud
from ...models.expense import Expense
from ...models.user import User
from ...schemas.expense import CategoryRead, ExpenseCreate, ExpenseRead, ExpenseUpdate
from ..deps import get_current_user

router = APIRouter(tags=["expenses"])


def _to_read(e: Expense) -> ExpenseRead:
    out = ExpenseRead.model_validate(e)
    if e.category:
        out.category_name = e.category.name
    if e.product:
        out.product_name = e.product.name
    return out


@router.get("/categories", response_model=list[CategoryRead])
def list_categories(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CategoryRead]:
    return [CategoryRead.model_validate(c) for c in crud.list_categories(db)]


@router.get("/expenses", response_model=list[ExpenseRead])
def list_expenses(
    category_id: Optional[int] = None,
    product_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ExpenseRead]:
    return [_to_read(e) for e in crud.list_expenses(
        db, category_id=category_id, product_id=product_id, date_from=date_from, date_to=date_to,
    )]


@router.post("/expenses", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExpenseRead:
    if not crud.get_category_by_id(db, payload.category_id):
        raise HTTPException(status_code=404, detail=f"Catégorie {payload.category_id} introuvable")
    return _to_read(crud.create(db, payload, current))


@router.patch("/expenses/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExpenseRead:
    expense = crud.get_by_id(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Dépense introuvable")
    return _to_read(crud.update(db, expense, payload))


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    expense = crud.get_by_id(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Dépense introuvable")
    crud.delete(db, expense)
