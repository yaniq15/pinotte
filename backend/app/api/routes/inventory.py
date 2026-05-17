from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from ...core.database import get_db
from ...crud import movement as movement_crud
from ...crud.movement import LOW_STOCK_THRESHOLD_BOXES
from ...crud import product as product_crud
from ...models.user import User
from ...schemas.movement import InventoryRow
from ..deps import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/current", response_model=list[InventoryRow])
def current_inventory(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InventoryRow]:
    """Per-product current stock. Stock is computed live as SUM(movements).
    Returns one row per product (including products with 0 stock or no movements)."""
    products = product_crud.list_all(db, include_inactive=True)
    by_pid = movement_crud.current_stock_by_product(db)
    rows: list[InventoryRow] = []
    for p in products:
        boxes = int(by_pid.get(p.id, 0))
        units = boxes * p.units_per_box
        unit_cost = float(p.unit_cost) if p.unit_cost is not None else None
        value = round(units * unit_cost, 2) if unit_cost is not None else None
        rows.append(InventoryRow(
            product_id=p.id,
            product_name=p.name,
            product_sku=p.sku,
            units_per_box=p.units_per_box,
            image_url=p.image_url,
            stock_boxes=boxes,
            stock_units=units,
            unit_cost=unit_cost,
            stock_value=value,
            low_stock=boxes < LOW_STOCK_THRESHOLD_BOXES,
        ))
    return rows
