"""Routes événements / festivals — calcul ROI auto."""
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...models.event import Event
from ...models.user import User
from ...schemas.event import EventCreate, EventRead, EventUpdate
from ..deps import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


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
    e = Event(**payload.model_dump(), created_by=current.id)
    db.add(e)
    db.commit()
    db.refresh(e)
    return _to_read(e)


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    payload: EventUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EventRead:
    e = db.get(Event, event_id)
    if not e:
        raise HTTPException(status_code=404, detail="Événement introuvable")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
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
