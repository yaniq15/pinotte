from calendar import monthrange
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
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


@router.get("/expenses/recurring/templates", response_model=list[ExpenseRead])
def list_recurring_templates(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ExpenseRead]:
    """Liste les dépenses récurrentes mensuelles, dédoublonnées par
    (description, vendor, montant). Ce sont les "modèles" applicables chaque mois."""
    rows = db.scalars(
        select(Expense)
        .where(Expense.is_recurring == True)  # noqa: E712
        .order_by(Expense.expense_date.desc())
    ).all()
    seen: dict[tuple, Expense] = {}
    for e in rows:
        # On ne propose à l'application mensuelle que les abos mensuels (ou sans
        # fréquence précisée — traités comme mensuels). Trimestriel/annuel = manuel.
        freq = e.recurrence_frequency or "monthly"
        if freq != "monthly":
            continue
        key = (e.description.strip().lower(), (e.vendor or "").strip().lower(), str(e.amount))
        if key not in seen:
            seen[key] = e
    return [_to_read(e) for e in seen.values()]


@router.post("/expenses/recurring/apply")
def apply_recurring_expenses(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Crée des instances de dépenses pour le mois cible à partir des modèles
    récurrents mensuels. Idempotent : si une dépense identique existe déjà ce
    mois-là (même description + montant), on la saute (pas de doublon)."""
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])

    # Modèles récurrents mensuels, dédoublonnés
    templates = list_recurring_templates(_=current, db=db)

    created = 0
    skipped = 0
    for tmpl in templates:
        # Déjà une dépense ce mois avec même description + montant ?
        exists = db.scalar(
            select(Expense).where(
                Expense.expense_date.between(start, end),
                Expense.description == tmpl.description,
                Expense.amount == tmpl.amount,
            )
        )
        if exists:
            skipped += 1
            continue
        # Crée l'instance — datée du 1er du mois, is_recurring=False (c'est une
        # occurrence concrète, pas un nouveau modèle).
        db.add(Expense(
            category_id=tmpl.category_id,
            product_id=tmpl.product_id,
            created_by=current.id,
            amount=tmpl.amount,
            currency=tmpl.currency,
            expense_date=start,
            vendor=tmpl.vendor,
            description=tmpl.description,
            receipt_url=None,
            paid_by=None,
            tps_paid=tmpl.tps_paid,
            tvq_paid=tmpl.tvq_paid,
            vendor_tps_number=tmpl.vendor_tps_number,
            vendor_tvq_number=tmpl.vendor_tvq_number,
            expense_type=tmpl.expense_type,
            is_recurring=False,
            recurrence_frequency=None,
            cca_class=tmpl.cca_class,
            deductibility_pct=tmpl.deductibility_pct or 100,
        ))
        created += 1
    db.commit()
    return {
        "created": created,
        "skipped": skipped,
        "total_templates": len(templates),
        "year": year,
        "month": month,
    }
