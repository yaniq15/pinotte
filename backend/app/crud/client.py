from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.client import Client
from ..schemas.client import ClientCreate, ClientUpdate


def list_all(db: Session, type: Optional[str] = None, include_inactive: bool = True) -> list[Client]:
    stmt = select(Client).order_by(Client.name)
    if type:
        stmt = stmt.where(Client.type == type)
    if not include_inactive:
        stmt = stmt.where(Client.active.is_(True))
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, client_id: int) -> Optional[Client]:
    return db.get(Client, client_id)


def create(db: Session, payload: ClientCreate) -> Client:
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def update(db: Session, client: Client, payload: ClientUpdate) -> Client:
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(client, k, v)
    db.commit()
    db.refresh(client)
    return client


def delete(db: Session, client: Client) -> None:
    db.delete(client)
    db.commit()
