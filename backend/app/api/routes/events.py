"""Routes événements / festivals — calcul ROI auto."""
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import material as material_crud
from ...models.event import Event
from ...models.user import User
from ...schemas.event import EventCreate, EventRead, EventUpdate
from ...schemas.material import MaterialPurchaseCreate
from ..deps import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


def _sum_breakdown(breakdown: Optional[list]) -> Optional[Decimal]:
    """Somme des amount d'une liste de MaterialItem (dict ou Pydantic)."""
    if not breakdown:
        return None
    total = Decimal("0")
    for item in breakdown:
        amt = item.get("amount") if isinstance(item, dict) else item.amount
        total += Decimal(str(amt))
    return total.quantize(Decimal("0.01"))


def _process_breakdown_purchases(
    breakdown: Optional[list[dict]],
    event: Event,
    user: User,
    db: Session,
) -> Optional[list[dict]]:
    """Pour chaque ligne avec register_as_purchase=True + material_id + quantity
    et pas encore de purchase_id : crée un MaterialPurchase (stock + PMP recalculés)
    et stocke le purchase_id dans la ligne pour éviter une recréation au prochain update.
    """
    if not breakdown:
        return breakdown
    processed: list[dict] = []
    for item in breakdown:
        row = dict(item)  # copie défensive
        should_register = bool(row.get("register_as_purchase"))
        already_done = row.get("purchase_id") is not None
        mat_id = row.get("material_id")
        qty = row.get("quantity")
        amt = row.get("amount")
        if should_register and not already_done and mat_id and qty and Decimal(str(qty)) > 0:
            purchase = material_crud.create_purchase(
                db=db,
                payload=MaterialPurchaseCreate(
                    material_id=int(mat_id),
                    quantity=Decimal(str(qty)),
                    total_cost=Decimal(str(amt or 0)),
                    vendor=f"Événement: {event.name}"[:200],
                    paid_by=None,
                    purchase_date=event.start_date,
                    receipt_url=None,
                    notes=f"Achat enregistré depuis l'événement #{event.id}",
                ),
                user=user,
            )
            row["purchase_id"] = purchase.id
        processed.append(row)
    return processed


def _to_read(e: Event) -> EventRead:
    total_cost = (
        Decimal(e.registration_fee) + Decimal(e.transport_cost)
        + Decimal(e.other_costs) + Decimal(e.materials_cost)
    )
    revenue = Decimal(e.total_revenue)
    profit = revenue - total_cost
    roi_pct = float(profit / total_cost * 100) if total_cost > 0 else None
    out = EventRead.model_validate(e)
    out.total_cost = total_cost.quantize(Decimal("0.01"))
    out.profit = profit.quantize(Decimal("0.01"))
    out.roi_pct = round(roi_pct, 1) if roi_pct is not None else None
    return out


@router.get("", response_model=list[EventRead])
def list_events(
    status_filter: Optional[str] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EventRead]:
    stmt = select(Event).order_by(Event.start_date.desc())
    if status_filter:
        stmt = stmt.where(Event.status == status_filter)
    return [_to_read(e) for e in db.scalars(stmt).all()]


@router.post("", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EventRead:
    data = payload.model_dump()
    if data.get("materials_breakdown"):
        computed = _sum_breakdown(data["materials_breakdown"])
        if computed is not None:
            data["materials_cost"] = computed
    e = Event(**data, created_by=current.id)
    db.add(e)
    db.flush()  # On a besoin de e.id pour les vendor des purchases
    # Lignes marquées "register_as_purchase" → crée les MaterialPurchase
    if e.materials_breakdown:
        e.materials_breakdown = _process_breakdown_purchases(
            e.materials_breakdown, e, current, db,
        )
    db.commit()
    db.refresh(e)
    return _to_read(e)


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    payload: EventUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EventRead:
    e = db.get(Event, event_id)
    if not e:
        raise HTTPException(status_code=404, detail="Événement introuvable")
    data = payload.model_dump(exclude_unset=True)
    if "materials_breakdown" in data and data["materials_breakdown"]:
        data["materials_cost"] = _sum_breakdown(data["materials_breakdown"])
    for k, v in data.items():
        setattr(e, k, v)
    db.flush()
    if e.materials_breakdown:
        e.materials_breakdown = _process_breakdown_purchases(
            e.materials_breakdown, e, current, db,
        )
    db.commit()
    db.refresh(e)
    return _to_read(e)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    e = db.get(Event, event_id)
    if not e:
        raise HTTPException(status_code=404, detail="Événement introuvable")
    db.delete(e)
    db.commit()
