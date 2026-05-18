"""events table

Revision ID: ghi789events
Revises: def456materials
Create Date: 2026-05-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ghi789events"
down_revision: Union[str, None] = "def456materials"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="PLANNED"),
        sa.Column("registration_fee", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("transport_cost", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("other_costs", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("materials_cost", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_revenue", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("units_sold", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("events")
