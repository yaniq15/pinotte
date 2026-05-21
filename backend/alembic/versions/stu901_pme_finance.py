"""PME finance bundle — comptable PCGR + AR aging + capex + abos + cash + inventaire physique

Revision ID: stu901pmefinance
Revises: pqr678ingrlink
Create Date: 2026-05-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "stu901pmefinance"
down_revision: Union[str, None] = "pqr678ingrlink"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Categories : numéro de compte PCGR + type (COGS/OPEX/CAPEX) ──
    op.add_column("categories", sa.Column("account_code", sa.String(10), nullable=True))
    op.add_column("categories", sa.Column(
        "expense_type", sa.String(10), nullable=False, server_default="OPEX",
    ))

    # ── Expenses : champs comptables fins ──
    # override du type categorie si besoin (rare)
    op.add_column("expenses", sa.Column("expense_type", sa.String(10), nullable=True))
    # abonnements et récurrents
    op.add_column("expenses", sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("expenses", sa.Column("recurrence_frequency", sa.String(20), nullable=True))
    # immobilisations + amortissement fiscal canadien
    op.add_column("expenses", sa.Column("cca_class", sa.String(5), nullable=True))
    # déductibilité : 100% par défaut, 50% pour repas, 0 pour non-déductible
    op.add_column("expenses", sa.Column("deductibility_pct", sa.Integer(), nullable=False, server_default="100"))

    # ── Cash snapshots : solde bancaire saisi périodiquement par l'user ──
    op.create_table(
        "cash_snapshots",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False, index=True),
        sa.Column("balance", sa.Numeric(12, 2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_cash_snapshot_date", "cash_snapshots", ["snapshot_date"])

    # ── Inventaire physique : compte réel par produit, écart auto ──
    op.create_table(
        "inventory_counts",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), nullable=False, index=True),
        sa.Column("count_date", sa.Date(), nullable=False, index=True),
        sa.Column("physical_qty_boxes", sa.Integer(), nullable=False),
        sa.Column("theoretical_qty_boxes", sa.Integer(), nullable=False),
        sa.Column("delta_boxes", sa.Integer(), nullable=False),  # physical - theoretical
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Fixed assets : immobilisations corporelles (équipement, véhicules…) ──
    # Distinct des Expenses pour traçabilité du tableau d'amortissement
    op.create_table(
        "fixed_assets",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True)        ,
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=False, index=True),
        sa.Column("cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("cca_class", sa.String(5), nullable=False),  # 8, 10, 50, etc.
        sa.Column("cca_rate_pct", sa.Numeric(5, 2), nullable=False),  # 20, 30, 55…
        sa.Column("accumulated_depreciation", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("disposal_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("fixed_assets")
    op.drop_table("inventory_counts")
    op.drop_constraint("uq_cash_snapshot_date", "cash_snapshots", type_="unique")
    op.drop_table("cash_snapshots")
    op.drop_column("expenses", "deductibility_pct")
    op.drop_column("expenses", "cca_class")
    op.drop_column("expenses", "recurrence_frequency")
    op.drop_column("expenses", "is_recurring")
    op.drop_column("expenses", "expense_type")
    op.drop_column("categories", "expense_type")
    op.drop_column("categories", "account_code")
