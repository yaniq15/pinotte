"""events.materials_breakdown JSON column

Revision ID: jkl012matsbreakdown
Revises: ghi789events
Create Date: 2026-05-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "jkl012matsbreakdown"
down_revision: Union[str, None] = "ghi789events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("materials_breakdown", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("events", "materials_breakdown")
