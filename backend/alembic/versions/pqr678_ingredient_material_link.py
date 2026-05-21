"""product_ingredients.material_id (FK vers materials) + wipe des recettes fictives

Revision ID: pqr678ingrlink
Revises: mno345exptaxes
Create Date: 2026-05-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "pqr678ingrlink"
down_revision: Union[str, None] = "mno345exptaxes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Lien dur vers le catalogue. Nullable pour conserver les lignes "auto"
    # (emballage, main d'œuvre) qui ne sont pas des matières premières.
    op.add_column(
        "product_ingredients",
        sa.Column("material_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_product_ingredient_material",
        "product_ingredients", "materials",
        ["material_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_product_ingredients_material_id",
        "product_ingredients", ["material_id"],
    )

    # Les recettes actuelles sont des exemples fictifs — on les vide pour
    # repartir propre. Les produits gardent leurs noms/SKU/prix.
    op.execute("DELETE FROM product_ingredients")


def downgrade() -> None:
    op.drop_index("ix_product_ingredients_material_id", table_name="product_ingredients")
    op.drop_constraint("fk_product_ingredient_material", "product_ingredients", type_="foreignkey")
    op.drop_column("product_ingredients", "material_id")
