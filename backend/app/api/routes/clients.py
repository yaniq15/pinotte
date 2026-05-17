from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import client as crud
from ...models.user import User
from ...schemas.client import ClientCreate, ClientRead, ClientUpdate
from ..deps import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientRead])
def list_clients(
    type: Optional[str] = None,
    include_inactive: bool = True,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ClientRead]:
    return [ClientRead.model_validate(c) for c in crud.list_all(db, type=type, include_inactive=include_inactive)]


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientRead:
    return ClientRead.model_validate(crud.create(db, payload))


@router.get("/{client_id}", response_model=ClientRead)
def get_client(
    client_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientRead:
    client = crud.get_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    return ClientRead.model_validate(client)


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientRead:
    client = crud.get_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    return ClientRead.model_validate(crud.update(db, client, payload))


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    client = crud.get_by_id(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    try:
        crud.delete(db, client)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Client lié à des ventes — désactive-le plutôt",
        )
