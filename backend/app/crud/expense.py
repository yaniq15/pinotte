from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.expense import Category, Expense
from ..models.user import User
from ..schemas.expense import ExpenseCreate, ExpenseUpdate


def list_categories(db: Session) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)).all())


def get_category_by_id(db: Session, cid: int) -> Optional[Category]:
    return db.get(Category, cid)


def get_category_by_name(db: Session, name: str) -> Optional[Category]:
    return db.scalar(select(Category).where(Category.name == name))


def list_expenses(
    db: Session,
    *,
    category_id: Optional[int] = None,
    product_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[Expense]:
    stmt = select(Expense).order_by(Expense.expense_date.desc(), Expense.id.desc())
    if category_id is not None:
        stmt = stmt.where(Expense.category_id == category_id)
    if product_id is not None:
        stmt = stmt.where(Expense.product_id == product_id)
    if date_from:
        stmt = stmt.where(Expense.expense_date >= date_from)
    if date_to:
        stmt = stmt.where(Expense.expense_date <= date_to)
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, expense_id: int) -> Optional[Expense]:
    return db.get(Expense, expense_id)


def create(db: Session, payload: ExpenseCreate, created_by: User) -> Expense:
    expense = Expense(**payload.model_dump(), created_by=created_by.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def update(db: Session, expense: Expense, payload: ExpenseUpdate) -> Expense:
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(expense, k, v)
    db.commit()
    db.refresh(expense)
    return expense


def delete(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.commit()
