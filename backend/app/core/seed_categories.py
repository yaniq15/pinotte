"""Idempotent seed of the 8 default expense categories at boot."""
from sqlalchemy.orm import Session

from ..models.expense import Category

DEFAULT_CATEGORIES = [
    "Matières premières",
    "Production",
    "Transport",
    "Marketing",
    "Frais courtier",
    "Salaires",
    "Imprévus",
    "Autre",
]


def seed_categories(db: Session) -> int:
    existing = {c.name for c in db.query(Category).all()}
    created = 0
    for name in DEFAULT_CATEGORIES:
        if name not in existing:
            db.add(Category(name=name))
            created += 1
    if created:
        db.commit()
    return created
