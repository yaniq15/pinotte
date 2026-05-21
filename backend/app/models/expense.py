from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base, TimestampMixin


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Numéro de compte PCGR (ex: "6010" pour Loyer). Permet au comptable d'importer
    # directement dans Acomba/QuickBooks/Sage sans retraitement.
    account_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    # COGS = coût des marchandises vendues (variable, suit les ventes)
    # OPEX = charges d'exploitation (fixes, loyer/admin/marketing)
    # CAPEX = immobilisation > 500 $ à amortir (équipement, véhicule)
    expense_type: Mapped[str] = mapped_column(String(10), nullable=False, default="OPEX")


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False, index=True)
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id"), nullable=True)
    batch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("batches.id"), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="CAD", nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    vendor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # Qui a payé la dépense (champ libre : "Moi", "Yannick", "Marie", etc.)
    paid_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Taxes payées sur cette dépense (récupérables comme Crédit Taxe Intrant — CTI/RTI)
    # Si renseignées, amount_HT = amount - tps_paid - tvq_paid (= base imposable)
    tps_paid: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    tvq_paid: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    # Numéros TPS/TVQ du fournisseur — obligatoires pour réclamer CTI > 30$
    vendor_tps_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    vendor_tvq_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    # Override du type catégorie (rare — ex: un repas = OPEX même si Category="Marketing"=OPEX)
    expense_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    # Abonnement récurrent ? Permet la vue "Abonnements actifs" et le détecteur de dormants
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurrence_frequency: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # CCA class si CAPEX (8 = matériel, 10 = véhicule motorisé, 50 = ordinateur, etc.)
    cca_class: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    # Déductibilité fiscale : 100 par défaut, 50 pour repas d'affaires, 0 si non-déductible
    deductibility_pct: Mapped[int] = mapped_column(default=100, nullable=False)

    category = relationship("Category", lazy="joined")
    product = relationship("Product", lazy="joined")
