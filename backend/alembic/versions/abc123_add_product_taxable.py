"""add product.taxable column

Revision ID: abc123taxable
Revises: 10beacdc3b19
Create Date: 2026-05-18

Adds `taxable` boolean column to products. Default False because most
Aliments Chika products are food (épicerie de base au QC = détaxée).
Existing products keep the default; toggle case by case in the UI.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "abc123taxable"
down_revision: Union[str, None] = "10beacdc3b19"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("taxable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("products", "taxable")
