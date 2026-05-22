"""user.must_change_password flag for invited users

Revision ID: vwx234mustchpw
Revises: stu901pmefinance
Create Date: 2026-05-22

Adds a boolean flag on users to mark accounts created via OWNER invite
(receive a temp password). Frontend redirects these users to Settings →
Sécurité until they change the password themselves. Reset to false on
successful PATCH /api/auth/me/password.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "vwx234mustchpw"
down_revision: Union[str, None] = "stu901pmefinance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "must_change_password")
