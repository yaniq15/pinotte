"""expenses.tps_paid + tvq_paid + vendor tax numbers

Revision ID: mno345exptaxes
Revises: jkl012matsbreakdown
Create Date: 2026-05-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "mno345exptaxes"
down_revision: Union[str, None] = "jkl012matsbreakdown"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Montants TPS/TVQ payés (récupérables comme Crédit Taxe Intrant)
    op.add_column("expenses", sa.Column("tps_paid", sa.Numeric(12, 2), nullable=True))
    op.add_column("expenses", sa.Column("tvq_paid", sa.Numeric(12, 2), nullable=True))
    # Numéros TPS/TVQ du fournisseur (requis pour réclamer le CTI > 30$)
    op.add_column("expenses", sa.Column("vendor_tps_number", sa.String(length=30), nullable=True))
    op.add_column("expenses", sa.Column("vendor_tvq_number", sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column("expenses", "vendor_tvq_number")
    op.drop_column("expenses", "vendor_tps_number")
    op.drop_column("expenses", "tvq_paid")
    op.drop_column("expenses", "tps_paid")
