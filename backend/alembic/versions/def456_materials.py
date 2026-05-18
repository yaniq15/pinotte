"""materials + purchases + movements + expense.paid_by

Revision ID: def456materials
Revises: abc123taxable
Create Date: 2026-05-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "def456materials"
down_revision: Union[str, None] = "abc123taxable"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Catalogue des matières premières (cajou, chanvre, sachets…)
    op.create_table(
        "materials",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=150), nullable=False, unique=True),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("current_stock", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("weighted_avg_price", sa.Numeric(12, 4), nullable=False, server_default="0"),
        sa.Column("low_stock_threshold", sa.Numeric(12, 3), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2) Achats (approvisionnements) — chaque ligne représente une facture fournisseur
    op.create_table(
        "material_purchases",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("material_id", sa.BigInteger(), sa.ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column("total_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("vendor", sa.String(length=200), nullable=True),
        sa.Column("paid_by", sa.String(length=100), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=False, index=True),
        sa.Column("receipt_url", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3) Mouvements (audit log : achat, consommation batch, perte, ajustement)
    op.create_table(
        "material_movements",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("material_id", sa.BigInteger(), sa.ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("movement_type", sa.String(length=30), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column("batch_id", sa.BigInteger(), sa.ForeignKey("batches.id", ondelete="SET NULL"), nullable=True),
        sa.Column("purchase_id", sa.BigInteger(), sa.ForeignKey("material_purchases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("movement_date", sa.Date(), nullable=False, index=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 4) Colonne paid_by sur expenses
    op.add_column("expenses", sa.Column("paid_by", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("expenses", "paid_by")
    op.drop_table("material_movements")
    op.drop_table("material_purchases")
    op.drop_table("materials")
