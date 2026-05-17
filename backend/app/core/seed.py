"""Idempotent seed of Chika's real 3 products on app boot."""
from decimal import Decimal

from sqlalchemy.orm import Session

from ..crud import product as product_crud
from ..models.product import Product
from ..schemas.product import ProductCreate

CHIKA_PRODUCTS = [
    ProductCreate(
        name="Chikanda à l'arachide",
        sku="CHIKANDA-ARACHIDE",
        units_per_box=12,
        unit_cost=Decimal("2.50"),
        price_broker=Decimal("4.50"),
        price_direct=Decimal("6.99"),
        currency="CAD",
        active=True,
        image_url="/brand/product-chikanda-arachide.png",
    ),
    ProductCreate(
        name="Chikanda au cajou",
        sku="CHIKANDA-CAJOU",
        units_per_box=12,
        unit_cost=Decimal("3.10"),
        price_broker=Decimal("5.20"),
        price_direct=Decimal("7.99"),
        currency="CAD",
        active=True,
        image_url="/brand/product-chikanda-cajou.jpg",
    ),
    ProductCreate(
        name="Sauce Mafé Végé",
        sku="SAUCE-MAFE",
        units_per_box=12,
        unit_cost=Decimal("3.80"),
        price_broker=Decimal("6.50"),
        price_direct=Decimal("9.99"),
        currency="CAD",
        active=True,
        image_url="/brand/product-sauce-mafe.jpg",
    ),
]


def seed_products(db: Session) -> int:
    """Insert any missing Chika products. Returns the number of products created."""
    created = 0
    for payload in CHIKA_PRODUCTS:
        if not product_crud.get_by_sku(db, payload.sku):
            product_crud.create(db, payload)
            created += 1
    return created
