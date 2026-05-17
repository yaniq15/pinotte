"""Idempotent seed of Chika's real 3 products at boot.

Pricing source : spreadsheet "Structure de prix Aliments Chika" (mai 2026).
This seed is **upsert** : on every boot, the prices/units_per_box/store_margin of
the 3 seeded SKUs are aligned with the values below so a code change here flows
through to the running DB immediately.
"""
from decimal import Decimal

from sqlalchemy.orm import Session

from ..crud import product as product_crud
from ..models.product import Product
from ..schemas.product import ProductCreate

# Real Chika pricing (PDS = prix de vente consommateur)
# - store_margin_pct = 0.35 → prix coutant magasin = PDS × 0.65
# - units_per_box = 10 for Chikanda, 12 for Sauce Mafé
# - price_direct = PDS × (1 − store_margin) = what Chika gets when selling direct to a STORE
# - price_broker default = price_direct × (1 − 0.18)  (default distribution rate 18%)
#   The actual broker rate is per-client, so price_broker stored here is just an
#   "indicative average" — the real price at sale time is computed from client.distribution_rate_pct.

_DEFAULT_STORE_MARGIN = Decimal("0.35")
_DEFAULT_DISTRIB_RATE = Decimal("0.18")


def _compute_prices(consumer: Decimal) -> tuple[Decimal, Decimal]:
    """Return (price_direct, price_broker) derived from consumer price + defaults."""
    direct = (consumer * (Decimal("1") - _DEFAULT_STORE_MARGIN)).quantize(Decimal("0.01"))
    broker = (direct   * (Decimal("1") - _DEFAULT_DISTRIB_RATE)).quantize(Decimal("0.01"))
    return direct, broker


CHIKA_SPECS = [
    # (name, sku, units_per_box, consumer_price, unit_cost, image)
    ("Chikanda à l'arachide",  "CHIKANDA-ARACHIDE", 10, Decimal("9.99"),  Decimal("2.50"),
     "/brand/product-chikanda-arachide.png"),
    ("Chikanda au cajou",      "CHIKANDA-CAJOU",    10, Decimal("9.99"),  Decimal("3.10"),
     "/brand/product-chikanda-cajou.jpg"),
    ("Sauce Mafé Végé",        "SAUCE-MAFE",        12, Decimal("12.99"), Decimal("3.80"),
     "/brand/product-sauce-mafe.jpg"),
]


def _spec_to_payload(spec) -> ProductCreate:
    name, sku, upb, consumer, unit_cost, image = spec
    direct, broker = _compute_prices(consumer)
    return ProductCreate(
        name=name, sku=sku, units_per_box=upb,
        unit_cost=unit_cost,
        consumer_price=consumer,
        store_margin_pct=_DEFAULT_STORE_MARGIN,
        price_direct=direct,
        price_broker=broker,
        currency="CAD", active=True, image_url=image,
    )


def seed_products(db: Session) -> int:
    """Upsert the 3 Chika products. Returns the count of inserts + updates that
    actually changed the row (handy for log)."""
    changed = 0
    for spec in CHIKA_SPECS:
        payload = _spec_to_payload(spec)
        existing = product_crud.get_by_sku(db, payload.sku)
        if existing is None:
            product_crud.create(db, payload)
            changed += 1
            continue
        # Realign existing seeded product to current spec
        dirty = False
        for field in ("name", "units_per_box", "unit_cost", "consumer_price",
                      "store_margin_pct", "price_direct", "price_broker",
                      "image_url"):
            new_val = getattr(payload, field)
            if getattr(existing, field) != new_val:
                setattr(existing, field, new_val)
                dirty = True
        if dirty:
            db.commit()
            changed += 1
    return changed
