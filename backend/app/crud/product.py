from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.product import Product
from ..schemas.product import ProductCreate, ProductUpdate


def list_all(db: Session, include_inactive: bool = True) -> list[Product]:
    stmt = select(Product).order_by(Product.name)
    if not include_inactive:
        stmt = stmt.where(Product.active.is_(True))
    return list(db.scalars(stmt).all())


def get_by_id(db: Session, product_id: int) -> Optional[Product]:
    return db.get(Product, product_id)


def get_by_sku(db: Session, sku: str) -> Optional[Product]:
    return db.scalar(select(Product).where(Product.sku == sku))


def create(db: Session, payload: ProductCreate) -> Product:
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update(db: Session, product: Product, payload: ProductUpdate) -> Product:
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(product, k, v)
    db.commit()
    db.refresh(product)
    return product


def delete(db: Session, product: Product) -> None:
    db.delete(product)
    db.commit()
