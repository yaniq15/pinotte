"""sale_items : lignes manuelles (facture sans produit)

Revision ID: defg90manuallines
Revises: cdef78salerevisions
Create Date: 2026-09-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "defg90manuallines"
down_revision: Union[str, None] = "cdef78salerevisions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Une ligne de facture peut maintenant être 100% manuelle : pas de produit
    # du catalogue, juste un libellé libre + un montant. Sert à facturer un
    # service, un frais ponctuel, un lot hors-catalogue, etc. sans polluer les
    # produits ni toucher le stock.
    op.alter_column("sale_items", "product_id", existing_type=sa.BigInteger(), nullable=True)
    op.add_column("sale_items", sa.Column("description", sa.Text(), nullable=True))
    # taxable : uniquement pour les lignes manuelles (les lignes produit lisent
    # products.taxable). NULL = ligne produit (on ignore ce champ).
    op.add_column("sale_items", sa.Column("taxable", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("sale_items", "taxable")
    op.drop_column("sale_items", "description")
    op.alter_column("sale_items", "product_id", existing_type=sa.BigInteger(), nullable=False)
