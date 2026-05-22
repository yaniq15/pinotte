"""password_reset_tokens table for self-service password reset by email

Revision ID: yzab56resettok
Revises: vwx234mustchpw
Create Date: 2026-05-22

Stocke un hash SHA256 du token (jamais le plain) pour qu'une fuite de la DB
ne permette pas d'utiliser les tokens. TTL 24h. used_at non-null = token brûlé.
ON DELETE CASCADE sur user_id pour nettoyer si un user est supprimé.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "yzab56resettok"
down_revision: Union[str, None] = "vwx234mustchpw"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("password_reset_tokens")
