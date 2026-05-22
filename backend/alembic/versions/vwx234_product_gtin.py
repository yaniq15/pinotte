"""products.gtin + barcode_image_url — code GS1 pour étiquettes

Revision ID: vwx234productgtin
Revises: yzab56resettok
Create Date: 2026-05-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "vwx234productgtin"
down_revision: Union[str, None] = "yzab56resettok"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # GTIN-13/14 (code GS1 numérique) — l'app génère le code-barres EAN-13
    op.add_column("products", sa.Column("gtin", sa.String(14), nullable=True))
    # URL d'une image de code-barres uploadée (alternative au GTIN généré)
    op.add_column("products", sa.Column("barcode_image_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "barcode_image_url")
    op.drop_column("products", "gtin")
