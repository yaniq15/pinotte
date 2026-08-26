"""products.boxes_per_lot + sale_items révisions (correction prix par lot, perte)

Revision ID: cdef78salerevisions
Revises: vwx234productgtin
Create Date: 2026-08-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "cdef78salerevisions"
down_revision: Union[str, None] = "vwx234productgtin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Taille du lot commercial (ex. 10 caisses = 1 lot pour le chiklanda,
    # 12 pour la sauce mafé) — sert au calcul auto du nb de lots facturés.
    op.add_column("products", sa.Column("boxes_per_lot", sa.Integer(), nullable=True))

    # Une ligne de vente peut maintenant être une correction (pas juste un
    # produit vendu) : révision de prix par lot déjà fourni, ou crédit pour
    # perte déclarée sur une livraison déjà facturée. La ligne PRODUCT
    # d'origine n'est jamais modifiée — la révision s'ajoute à côté, ce qui
    # garde une trace tout en faisant que total_amount (somme des lignes)
    # reste toujours le vrai montant courant partout où il est lu.
    op.add_column(
        "sale_items",
        sa.Column("line_type", sa.String(20), nullable=False, server_default="PRODUCT"),
    )
    op.add_column("sale_items", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column(
        "sale_items",
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sale_items", "created_by")
    op.drop_column("sale_items", "notes")
    op.drop_column("sale_items", "line_type")
    op.drop_column("products", "boxes_per_lot")
