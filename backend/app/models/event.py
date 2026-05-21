"""Événements / Festivals — module ROI vente directe.

Tu enregistres chaque événement (Festival Africain Montréal, marché de Noël…)
avec ses coûts (kiosque, transport, matières utilisées) et ses revenus
encaissés sur place. L'app calcule ton ROI automatiquement.
"""
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base, TimestampMixin


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PLANNED")  # PLANNED | ONGOING | DONE | CANCELLED

    # Coûts (à entrer avant/pendant l'événement)
    registration_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    transport_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    other_costs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    # Total matières (recalculé = SUM(materials_breakdown[].amount) si breakdown fourni)
    materials_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    # Détail ligne par ligne — [{"label": "Arachides 50kg", "amount": 120.50}, ...]
    # Permet de tracer les achats "au fur et à mesure" en cours d'événement
    materials_breakdown: Mapped[Optional[list[dict]]] = mapped_column(JSONB, nullable=True)

    # Revenus
    total_revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    units_sold: Mapped[int] = mapped_column(default=0, nullable=False)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
