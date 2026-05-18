import csv
import io
from calendar import monthrange
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud.movement import LOW_STOCK_THRESHOLD_BOXES
from ...models.client import Client
from ...models.expense import Category, Expense
from ...models.movement import Movement
from ...models.product import Product
from ...models.sale import Sale, SaleItem
from ...models.user import User
from ..deps import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


def _month_range(year: int, month: int) -> tuple[date, date]:
    first = date(year, month, 1)
    last = date(year, month, monthrange(year, month)[1])
    return first, last


@router.get("/monthly")
def monthly_report(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Aggregate monthly report — revenue, expenses, margin, top clients, low stock."""
    start, end = _month_range(year, month)

    # 1. Revenue (PAID sales only — what really hit the bank)
    revenue_paid = float(db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0))
        .where(Sale.status == "PAID", Sale.payment_date.between(start, end))
    ) or 0)

    # 2. Accounts receivable = DELIVERED but not PAID, regardless of date
    accounts_receivable = float(db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0))
        .where(Sale.status == "DELIVERED")
    ) or 0)

    # 3. Expenses
    expenses_total = float(db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.expense_date.between(start, end))
    ) or 0)

    expenses_by_cat = db.execute(
        select(Category.name, func.coalesce(func.sum(Expense.amount), 0).label("total"))
        .join(Expense, Expense.category_id == Category.id)
        .where(Expense.expense_date.between(start, end))
        .group_by(Category.name)
        .order_by(func.sum(Expense.amount).desc())
    ).all()
    expenses_by_category = [{"category": name, "total": float(total)} for name, total in expenses_by_cat]

    # 4. Net profit (revenue paid − expenses this month)
    net_profit = revenue_paid - expenses_total

    # 5. Sales by product (toutes non-annulées + sous-total PAID seulement)
    sales_by_product_rows = db.execute(
        select(
            Product.id, Product.name, Product.sku, Product.units_per_box, Product.unit_cost,
            func.coalesce(func.sum(SaleItem.quantity_boxes), 0).label("boxes"),
            func.coalesce(func.sum(SaleItem.subtotal), 0).label("revenue"),
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.sale_date.between(start, end), Sale.status != "CANCELLED")
        .group_by(Product.id, Product.name, Product.sku, Product.units_per_box, Product.unit_cost)
        .order_by(func.sum(SaleItem.subtotal).desc())
    ).all()

    # 5b. Revenus encaissés (PAID) par produit
    paid_rows = db.execute(
        select(
            SaleItem.product_id,
            func.coalesce(func.sum(SaleItem.subtotal), 0).label("revenue_paid"),
            func.coalesce(func.sum(SaleItem.quantity_boxes), 0).label("boxes_paid"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.sale_date.between(start, end), Sale.status == "PAID")
        .group_by(SaleItem.product_id)
    ).all()
    paid_by_pid = {r.product_id: (float(r.revenue_paid), int(r.boxes_paid)) for r in paid_rows}

    sales_by_product = []
    margin_by_product = []
    for row in sales_by_product_rows:
        boxes = int(row.boxes)
        revenue = float(row.revenue)
        cost = float(boxes * row.units_per_box * (row.unit_cost or 0))
        margin = revenue - cost
        margin_pct = (margin / revenue * 100) if revenue else 0

        # Marge encaissée (sur ventes PAID seulement)
        rev_paid, boxes_paid = paid_by_pid.get(row.id, (0.0, 0))
        cost_paid = float(boxes_paid * row.units_per_box * (row.unit_cost or 0))
        margin_paid = rev_paid - cost_paid
        margin_paid_pct = (margin_paid / rev_paid * 100) if rev_paid else 0

        sales_by_product.append({
            "product_id": row.id, "product_name": row.name, "product_sku": row.sku,
            "boxes_sold": boxes, "revenue": revenue,
        })
        margin_by_product.append({
            "product_id": row.id, "product_name": row.name,
            "revenue": revenue, "cost": cost, "margin": margin, "margin_pct": round(margin_pct, 1),
            "revenue_paid": rev_paid, "margin_paid": margin_paid,
            "margin_paid_pct": round(margin_paid_pct, 1),
        })

    # 6. Top clients (by revenue this month, excluding cancelled)
    top_clients_rows = db.execute(
        select(Client.id, Client.name, Client.type,
               func.coalesce(func.sum(Sale.total_amount), 0).label("total"))
        .join(Sale, Sale.client_id == Client.id)
        .where(Sale.sale_date.between(start, end), Sale.status != "CANCELLED")
        .group_by(Client.id, Client.name, Client.type)
        .order_by(func.sum(Sale.total_amount).desc())
        .limit(5)
    ).all()
    top_clients = [
        {"client_id": r.id, "client_name": r.name, "client_type": r.type, "total": float(r.total)}
        for r in top_clients_rows
    ]

    # 7. Inventory value + low-stock alerts
    by_pid = dict(db.execute(
        select(Movement.product_id, func.coalesce(func.sum(Movement.quantity_boxes), 0))
        .group_by(Movement.product_id)
    ).all())
    inventory_value = 0.0
    low_stock_alerts = []
    for p in db.scalars(select(Product)).all():
        boxes = int(by_pid.get(p.id, 0))
        if p.unit_cost is not None:
            inventory_value += boxes * p.units_per_box * float(p.unit_cost)
        if boxes < LOW_STOCK_THRESHOLD_BOXES:
            low_stock_alerts.append({
                "product_id": p.id, "product_name": p.name, "product_sku": p.sku,
                "stock_boxes": boxes,
            })

    return {
        "year": year, "month": month,
        "revenue_paid": round(revenue_paid, 2),
        "accounts_receivable": round(accounts_receivable, 2),
        "expenses_total": round(expenses_total, 2),
        "expenses_by_category": expenses_by_category,
        "net_profit": round(net_profit, 2),
        "sales_by_product": sales_by_product,
        "margin_by_product": margin_by_product,
        "top_clients": top_clients,
        "inventory_value": round(inventory_value, 2),
        "low_stock_alerts": low_stock_alerts,
    }


# ── CSV exports ───────────────────────────────────────────────────────────────
@router.get("/exports/sales.csv", response_class=PlainTextResponse)
def export_sales_csv(
    year: Optional[int] = None,
    month: Optional[int] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlainTextResponse:
    stmt = select(Sale).order_by(Sale.sale_date.desc())
    if year and month:
        s, e = _month_range(year, month)
        stmt = stmt.where(Sale.sale_date.between(s, e))
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["sale_id", "date", "client", "client_type", "status", "currency",
                "total_amount", "payment_date", "product_sku", "product_name",
                "quantity_boxes", "unit_price", "subtotal"])
    # `.unique()` is required when iterating SQLAlchemy 2.x rows with joined-eager
    # relationships (Sale.items + Sale.client are both `lazy="joined"`).
    for sale in db.scalars(stmt).unique().all():
        if not sale.items:
            w.writerow([sale.id, sale.sale_date.isoformat(),
                        sale.client.name if sale.client else "",
                        sale.client.type if sale.client else "",
                        sale.status, sale.currency, float(sale.total_amount),
                        sale.payment_date.isoformat() if sale.payment_date else "",
                        "", "", "", "", ""])
            continue
        for it in sale.items:
            w.writerow([sale.id, sale.sale_date.isoformat(),
                        sale.client.name if sale.client else "",
                        sale.client.type if sale.client else "",
                        sale.status, sale.currency, float(sale.total_amount),
                        sale.payment_date.isoformat() if sale.payment_date else "",
                        it.product.sku if it.product else "",
                        it.product.name if it.product else "",
                        it.quantity_boxes, float(it.unit_price), float(it.subtotal)])
    return PlainTextResponse(
        buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="chika_sales.csv"'},
    )


@router.get("/exports/expenses.csv", response_class=PlainTextResponse)
def export_expenses_csv(
    year: Optional[int] = None,
    month: Optional[int] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlainTextResponse:
    stmt = select(Expense).order_by(Expense.expense_date.desc())
    if year and month:
        s, e = _month_range(year, month)
        stmt = stmt.where(Expense.expense_date.between(s, e))
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["expense_id", "date", "category", "amount", "currency", "vendor",
                "product", "description"])
    for ex in db.scalars(stmt).all():
        w.writerow([ex.id, ex.expense_date.isoformat(),
                    ex.category.name if ex.category else "",
                    float(ex.amount), ex.currency, ex.vendor or "",
                    ex.product.name if ex.product else "", ex.description])
    return PlainTextResponse(
        buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="chika_expenses.csv"'},
    )
