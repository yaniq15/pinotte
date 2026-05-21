"""Endpoints PME finance avancés : AR aging, cash runway, marge brute trend,
concentration, alertes, immobilisations, inventaire physique, abonnements.

Tous protégés par get_current_user.
"""
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...models.client import Client
from ...models.expense import Expense
from ...models.finance import CashSnapshot, FixedAsset, InventoryCount
from ...models.movement import Movement
from ...models.product import Product
from ...models.sale import Sale, SaleItem
from ...models.user import User
from ...schemas.finance import (
    AlertItem,
    AlertsReport,
    ARAgingBucket,
    ARAgingByClient,
    ARAgingReport,
    CashRunwayReport,
    CashSnapshotCreate,
    CashSnapshotRead,
    ConcentrationReport,
    ConcentrationRisk,
    FixedAssetCreate,
    FixedAssetRead,
    FixedAssetUpdate,
    GrossMarginPoint,
    InventoryCountCreate,
    InventoryCountRead,
)
from ..deps import get_current_user

router = APIRouter(prefix="/pme", tags=["pme-finance"])


# ╔══════════════════════════════════════════════════════════════╗
# ║  AR AGING — Comptes à recevoir par âge                        ║
# ╚══════════════════════════════════════════════════════════════╝
def _bucket_of_age(age_days: int) -> str:
    if age_days <= 30:
        return "days_0_30"
    if age_days <= 60:
        return "days_31_60"
    if age_days <= 90:
        return "days_61_90"
    return "days_90_plus"


@router.get("/ar-aging", response_model=ARAgingReport)
def ar_aging(
    as_of: Optional[date] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ARAgingReport:
    """Aged Accounts Receivable. Buckets : 0-30, 31-60, 61-90, 90+ jours.
    Une vente est "à recevoir" si status=DELIVERED (livrée mais pas encore payée).
    L'âge se calcule depuis sale_date jusqu'à `as_of` (default = aujourd'hui).
    """
    target = as_of or date.today()

    delivered = db.scalars(
        select(Sale).where(Sale.status == "DELIVERED")
    ).unique().all()

    by_client_dict: dict[int, ARAgingByClient] = {}
    totals = ARAgingBucket()

    for s in delivered:
        if not s.client:
            continue
        age = (target - s.sale_date).days
        bucket = _bucket_of_age(age)
        amount = Decimal(s.total_amount)

        # Total global
        setattr(totals, bucket, getattr(totals, bucket) + amount)
        totals.total += amount

        # Par client
        agg = by_client_dict.setdefault(s.client.id, ARAgingByClient(
            client_id=s.client.id, client_name=s.client.name,
            client_type=s.client.type,
        ))
        setattr(agg, bucket, getattr(agg, bucket) + amount)
        agg.total += amount
        agg.invoice_count += 1

    # DSO = moyenne pondérée des jours-vente outstanding sur les 90 derniers jours
    # Calcul simple : pour les ventes payées des 90 derniers jours, moyenne de
    # (payment_date - sale_date)
    ninety_days_ago = target - timedelta(days=90)
    paid_recent = db.scalars(
        select(Sale).where(
            Sale.status == "PAID",
            Sale.payment_date >= ninety_days_ago,
            Sale.payment_date.is_not(None),
        )
    ).unique().all()
    if paid_recent:
        total_days = sum((s.payment_date - s.sale_date).days for s in paid_recent)
        dso = total_days / len(paid_recent)
    else:
        dso = None

    by_client = sorted(by_client_dict.values(), key=lambda x: x.total, reverse=True)

    return ARAgingReport(
        as_of_date=target,
        totals=totals,
        by_client=by_client,
        dso_days=round(dso, 1) if dso else None,
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║  GROSS MARGIN TREND — 6 derniers mois                         ║
# ╚══════════════════════════════════════════════════════════════╝
def _cogs_for_month(db: Session, start: date, end: date) -> Decimal:
    """COGS d'un mois = ventes du mois × coût unitaire stocké au moment de la vente.
    On utilise unit_cost actuel du produit (faute de snapshot historique) — c'est
    une approximation acceptable pour le MVP.
    """
    rows = db.execute(
        select(SaleItem.quantity_boxes, Product.units_per_box, Product.unit_cost)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .join(Product, Product.id == SaleItem.product_id)
        .where(Sale.sale_date.between(start, end), Sale.status != "CANCELLED")
    ).all()
    total = Decimal("0")
    for qty_boxes, upb, uc in rows:
        if uc is None:
            continue
        total += Decimal(qty_boxes) * Decimal(upb or 1) * Decimal(uc)
    return total.quantize(Decimal("0.01"))


@router.get("/gross-margin-trend", response_model=list[GrossMarginPoint])
def gross_margin_trend(
    months: int = 6,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[GrossMarginPoint]:
    """Tendance marge brute sur N derniers mois (default 6). Calcul :
    GM% = (revenue_paid_mois - COGS_mois) / revenue_paid_mois × 100
    """
    today = date.today()
    points: list[GrossMarginPoint] = []
    for i in range(months - 1, -1, -1):
        # Calcule le 1er du mois N mois en arrière
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        start = date(y, m, 1)
        end = date(y, m, monthrange(y, m)[1])
        revenue = Decimal(db.scalar(
            select(func.coalesce(func.sum(Sale.total_amount), 0))
            .where(Sale.sale_date.between(start, end), Sale.status != "CANCELLED")
        ) or 0)
        cogs = _cogs_for_month(db, start, end)
        gm = revenue - cogs
        pct = float(gm / revenue * 100) if revenue > 0 else None
        points.append(GrossMarginPoint(
            year=y, month=m,
            revenue_paid=revenue.quantize(Decimal("0.01")),
            cogs=cogs,
            gross_margin=gm.quantize(Decimal("0.01")),
            gross_margin_pct=round(pct, 1) if pct is not None else None,
        ))
    return points


# ╔══════════════════════════════════════════════════════════════╗
# ║  CASH RUNWAY — solde bancaire + burn rate                     ║
# ╚══════════════════════════════════════════════════════════════╝
@router.post("/cash-snapshots", response_model=CashSnapshotRead, status_code=status.HTTP_201_CREATED)
def create_cash_snapshot(
    payload: CashSnapshotCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CashSnapshotRead:
    # Upsert : un seul snapshot par date
    existing = db.scalar(select(CashSnapshot).where(CashSnapshot.snapshot_date == payload.snapshot_date))
    if existing:
        existing.balance = payload.balance
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return CashSnapshotRead.model_validate(existing)
    snap = CashSnapshot(
        created_by=current.id,
        snapshot_date=payload.snapshot_date,
        balance=payload.balance,
        notes=payload.notes,
        created_at=datetime.now(timezone.utc),
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return CashSnapshotRead.model_validate(snap)


@router.get("/cash-snapshots", response_model=list[CashSnapshotRead])
def list_cash_snapshots(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CashSnapshotRead]:
    snaps = db.scalars(select(CashSnapshot).order_by(CashSnapshot.snapshot_date.desc())).all()
    return [CashSnapshotRead.model_validate(s) for s in snaps]


@router.get("/cash-runway", response_model=CashRunwayReport)
def cash_runway(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CashRunwayReport:
    """Cash runway = nombre de mois de survie au burn rate moyen 3 derniers mois.
    Burn rate = MOY(expenses_mois - revenue_paid_mois) pour les 3 derniers mois clos.
    Status :
      - critical : < 3 mois
      - warning  : 3-6 mois
      - healthy  : ≥ 6 mois
    """
    latest_snap = db.scalar(
        select(CashSnapshot).order_by(CashSnapshot.snapshot_date.desc()).limit(1)
    )
    if not latest_snap:
        return CashRunwayReport(status="no_data")

    today = date.today()
    burns: list[Decimal] = []
    for i in range(1, 4):  # 3 derniers mois clos
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        start = date(y, m, 1)
        end = date(y, m, monthrange(y, m)[1])
        rev = Decimal(db.scalar(
            select(func.coalesce(func.sum(Sale.total_amount), 0))
            .where(Sale.status == "PAID", Sale.payment_date.between(start, end))
        ) or 0)
        exp = Decimal(db.scalar(
            select(func.coalesce(func.sum(Expense.amount), 0))
            .where(Expense.expense_date.between(start, end))
        ) or 0)
        burns.append(exp - rev)
    avg_burn = (sum(burns) / Decimal(len(burns))).quantize(Decimal("0.01")) if burns else Decimal("0")

    runway = None
    statut = "no_data"
    if avg_burn > 0:
        runway = float(latest_snap.balance / avg_burn)
        if runway < 3:
            statut = "critical"
        elif runway < 6:
            statut = "warning"
        else:
            statut = "healthy"
    elif avg_burn <= 0:
        statut = "healthy"  # plus de revenus que de dépenses, runway infini
        runway = 999.0

    return CashRunwayReport(
        cash_balance=Decimal(latest_snap.balance),
        cash_balance_date=latest_snap.snapshot_date,
        avg_monthly_burn=avg_burn,
        runway_months=round(runway, 1) if runway is not None else None,
        status=statut,
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║  CONCENTRATION — clients & fournisseurs > 30% du volume       ║
# ╚══════════════════════════════════════════════════════════════╝
@router.get("/concentration", response_model=ConcentrationReport)
def concentration(
    months: int = 6,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConcentrationReport:
    """Concentration sur N derniers mois.
    - Clients : % de revenus par client (ventes non-CANCELLED)
    - Vendors : % de dépenses par fournisseur (Expense.vendor)
    is_risky = True si pct > 30%.
    """
    cutoff = date.today().replace(day=1)
    for _ in range(months):
        cutoff = (cutoff - timedelta(days=1)).replace(day=1)

    # Clients
    client_rows = db.execute(
        select(Client.id, Client.name, Client.type,
               func.coalesce(func.sum(Sale.total_amount), 0).label("total"))
        .join(Sale, Sale.client_id == Client.id)
        .where(Sale.sale_date >= cutoff, Sale.status != "CANCELLED")
        .group_by(Client.id, Client.name, Client.type)
        .order_by(func.sum(Sale.total_amount).desc())
    ).all()
    total_revenue = sum((Decimal(r.total) for r in client_rows), Decimal("0"))
    top_clients = []
    for r in client_rows[:10]:
        pct = float(Decimal(r.total) / total_revenue * 100) if total_revenue > 0 else 0
        top_clients.append(ConcentrationRisk(
            entity_id=r.id, entity_name=r.name, entity_type="client",
            total_amount=Decimal(r.total).quantize(Decimal("0.01")),
            pct_of_total=round(pct, 1),
            is_risky=pct > 30,
        ))

    # Vendors
    vendor_rows = db.execute(
        select(Expense.vendor, func.coalesce(func.sum(Expense.amount), 0).label("total"))
        .where(Expense.expense_date >= cutoff, Expense.vendor.is_not(None))
        .group_by(Expense.vendor)
        .order_by(func.sum(Expense.amount).desc())
    ).all()
    total_exp = sum((Decimal(r.total) for r in vendor_rows), Decimal("0"))
    top_vendors = []
    for i, r in enumerate(vendor_rows[:10]):
        pct = float(Decimal(r.total) / total_exp * 100) if total_exp > 0 else 0
        top_vendors.append(ConcentrationRisk(
            entity_id=i + 1, entity_name=r.vendor or "—", entity_type="vendor",
            total_amount=Decimal(r.total).quantize(Decimal("0.01")),
            pct_of_total=round(pct, 1),
            is_risky=pct > 30,
        ))

    return ConcentrationReport(
        period_months=months, top_clients=top_clients, top_vendors=top_vendors,
    )


# ╔══════════════════════════════════════════════════════════════╗
# ║  ABONNEMENTS RÉCURRENTS — total annualisé + détection         ║
# ╚══════════════════════════════════════════════════════════════╝
@router.get("/recurring-expenses")
def recurring_expenses(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Liste les abonnements actifs (is_recurring=True), calcule le total
    annualisé, et liste les "potentiellement dormants" : abonnements pour
    lesquels on n'a pas vu de paiement dans les 60 derniers jours.
    """
    today = date.today()
    sixty_days_ago = today - timedelta(days=60)

    # Abonnements distincts : on déduplique par (vendor, description, amount)
    # pour traiter chaque abo comme une "souscription" unique.
    rows = db.scalars(
        select(Expense)
        .where(Expense.is_recurring == True)  # noqa: E712
        .order_by(Expense.expense_date.desc())
    ).all()

    subs: dict[str, dict] = {}
    for ex in rows:
        key = f"{ex.vendor or '?'}|{ex.description}|{ex.amount}|{ex.recurrence_frequency or 'monthly'}"
        if key not in subs:
            multiplier = {"monthly": 12, "quarterly": 4, "yearly": 1}.get(
                ex.recurrence_frequency or "monthly", 12,
            )
            subs[key] = {
                "vendor": ex.vendor,
                "description": ex.description,
                "amount": float(ex.amount),
                "frequency": ex.recurrence_frequency or "monthly",
                "annualized": float(Decimal(ex.amount) * multiplier),
                "last_seen": ex.expense_date.isoformat(),
                "is_dormant": ex.expense_date < sixty_days_ago,
            }

    items = sorted(subs.values(), key=lambda s: s["annualized"], reverse=True)
    return {
        "items": items,
        "total_annualized": sum(s["annualized"] for s in items),
        "dormant_count": sum(1 for s in items if s["is_dormant"]),
    }


# ╔══════════════════════════════════════════════════════════════╗
# ║  IMMOBILISATIONS — CRUD + tableau d'amortissement             ║
# ╚══════════════════════════════════════════════════════════════╝
def _enrich_fixed_asset(a: FixedAsset) -> FixedAssetRead:
    book_value = (Decimal(a.cost) - Decimal(a.accumulated_depreciation)).quantize(Decimal("0.01"))
    annual_dep = (book_value * Decimal(a.cca_rate_pct) / 100).quantize(Decimal("0.01"))
    out = FixedAssetRead.model_validate(a)
    out.book_value = book_value
    out.annual_depreciation_estimate = annual_dep
    return out


@router.get("/fixed-assets", response_model=list[FixedAssetRead])
def list_fixed_assets(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FixedAssetRead]:
    rows = db.scalars(select(FixedAsset).order_by(FixedAsset.purchase_date.desc())).all()
    return [_enrich_fixed_asset(a) for a in rows]


@router.post("/fixed-assets", response_model=FixedAssetRead, status_code=status.HTTP_201_CREATED)
def create_fixed_asset(
    payload: FixedAssetCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FixedAssetRead:
    now = datetime.now(timezone.utc)
    a = FixedAsset(
        **payload.model_dump(),
        created_by=current.id,
        created_at=now, updated_at=now,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _enrich_fixed_asset(a)


@router.patch("/fixed-assets/{asset_id}", response_model=FixedAssetRead)
def update_fixed_asset(
    asset_id: int,
    payload: FixedAssetUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FixedAssetRead:
    a = db.get(FixedAsset, asset_id)
    if not a:
        raise HTTPException(status_code=404, detail="Immobilisation introuvable")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    a.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(a)
    return _enrich_fixed_asset(a)


@router.delete("/fixed-assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fixed_asset(
    asset_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    a = db.get(FixedAsset, asset_id)
    if not a:
        raise HTTPException(status_code=404, detail="Immobilisation introuvable")
    db.delete(a)
    db.commit()


# ╔══════════════════════════════════════════════════════════════╗
# ║  INVENTAIRE PHYSIQUE — saisie compte réel + ADJUSTMENT auto   ║
# ╚══════════════════════════════════════════════════════════════╝
def _theoretical_stock(db: Session, product_id: int) -> int:
    """SUM(movements.quantity_boxes) — le stock courant calculé."""
    qty = db.scalar(
        select(func.coalesce(func.sum(Movement.quantity_boxes), 0))
        .where(Movement.product_id == product_id)
    )
    return int(qty or 0)


@router.post("/inventory-counts", response_model=InventoryCountRead, status_code=status.HTTP_201_CREATED)
def create_inventory_count(
    payload: InventoryCountCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InventoryCountRead:
    product = db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    theo = _theoretical_stock(db, product.id)
    delta = payload.physical_qty_boxes - theo
    now = datetime.now(timezone.utc)
    count = InventoryCount(
        created_by=current.id,
        product_id=product.id,
        count_date=payload.count_date,
        physical_qty_boxes=payload.physical_qty_boxes,
        theoretical_qty_boxes=theo,
        delta_boxes=delta,
        notes=payload.notes,
        created_at=now,
    )
    db.add(count)
    # Mouvement ADJUSTMENT pour aligner le stock sur la réalité physique
    if delta != 0:
        db.add(Movement(
            product_id=product.id,
            created_by=current.id,
            movement_type="ADJUSTMENT",
            quantity_boxes=delta,  # signé
            reference_type="inventory_count",
            movement_date=payload.count_date,
            notes=f"Inventaire physique : ajustement de {delta:+d} boîte(s). {payload.notes or ''}".strip(),
        ))
    db.commit()
    db.refresh(count)
    return InventoryCountRead.model_validate({
        **count.__dict__,
        "product_name": product.name,
    })


@router.get("/inventory-counts", response_model=list[InventoryCountRead])
def list_inventory_counts(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InventoryCountRead]:
    rows = db.scalars(
        select(InventoryCount).order_by(InventoryCount.count_date.desc(), InventoryCount.id.desc())
    ).all()
    return [
        InventoryCountRead.model_validate({
            **c.__dict__,
            "product_name": c.product.name if c.product else None,
        })
        for c in rows
    ]


# ╔══════════════════════════════════════════════════════════════╗
# ║  ALERTS ENGINE — moteur d'alertes proactives                  ║
# ╚══════════════════════════════════════════════════════════════╝
@router.get("/alerts", response_model=AlertsReport)
def alerts(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AlertsReport:
    """Moteur d'alertes : combine plusieurs signaux pour pousser les actions
    importantes en haut du dashboard. Tous les calculs sont à la demande
    (pas de cron, suffisant pour MVP).
    """
    items: list[AlertItem] = []
    today = date.today()

    # 1) Factures à recevoir > 90 jours
    aging = ar_aging(as_of=today, db=db)  # type: ignore[arg-type]
    if aging.totals.days_90_plus > 0:
        items.append(AlertItem(
            severity="critical",
            category="ar_aging",
            title=f"Factures impayées > 90 jours : {float(aging.totals.days_90_plus):.0f} $",
            description="Plusieurs clients te doivent de l'argent depuis plus de 3 mois. Relance-les ou flag-les comme créance douteuse.",
            action_label="Voir le détail",
            action_url="/comptes-a-recevoir",
        ))
    elif aging.totals.days_61_90 > 0:
        items.append(AlertItem(
            severity="warning",
            category="ar_aging",
            title=f"Factures à recevoir > 60 jours : {float(aging.totals.days_61_90):.0f} $",
            description="Surveille ces clients de près — un mois de plus et ils basculent en zone rouge.",
            action_label="Voir le détail",
            action_url="/comptes-a-recevoir",
        ))

    # 2) Runway critique
    runway = cash_runway(db=db)  # type: ignore[arg-type]
    if runway.status == "critical" and runway.runway_months is not None:
        items.append(AlertItem(
            severity="critical",
            category="runway",
            title=f"Cash runway : {runway.runway_months:.1f} mois seulement",
            description=f"Au burn moyen actuel ({float(runway.avg_monthly_burn or 0):.0f} $/mois), tu n'as plus que {runway.runway_months:.1f} mois de trésorerie. Augmenter les revenus ou couper des dépenses maintenant.",
            action_label="Voir détail",
            action_url="/profil",
        ))
    elif runway.status == "warning" and runway.runway_months is not None:
        items.append(AlertItem(
            severity="warning",
            category="runway",
            title=f"Cash runway : {runway.runway_months:.1f} mois",
            description="Surveille la trésorerie — moins de 6 mois de runway. Préparer un plan de financement si besoin.",
        ))

    # 3) Marge brute en érosion
    trend = gross_margin_trend(months=6, db=db)  # type: ignore[arg-type]
    valid = [p for p in trend if p.gross_margin_pct is not None]
    if len(valid) >= 4:
        recent = valid[-1].gross_margin_pct or 0
        avg_prev = sum(p.gross_margin_pct or 0 for p in valid[:-1]) / max(1, len(valid) - 1)
        if recent < avg_prev - 5:  # 5 points de chute
            items.append(AlertItem(
                severity="warning",
                category="margin",
                title=f"Marge brute en chute : {recent:.1f}% vs moyenne {avg_prev:.1f}%",
                description="Ta marge brute du mois courant est nettement sous la moyenne des 5 derniers mois. Coûts matières en hausse ? Prix de vente à ajuster ?",
                action_label="Voir simulateur",
                action_url="/simulateur",
            ))

    # 4) Concentration > 30% sur 1 client
    conc = concentration(months=6, db=db)  # type: ignore[arg-type]
    for c in conc.top_clients[:3]:
        if c.is_risky:
            items.append(AlertItem(
                severity="warning",
                category="concentration",
                title=f"{c.entity_name} = {c.pct_of_total:.0f}% de tes revenus",
                description="Forte dépendance à ce client. S'il te lâche, l'impact serait majeur. Diversifie ta clientèle.",
            ))

    # 5) Abonnements dormants
    subs = recurring_expenses(db=db)  # type: ignore[arg-type]
    if subs["dormant_count"] > 0:
        items.append(AlertItem(
            severity="info",
            category="subscription",
            title=f"{subs['dormant_count']} abonnement(s) sans paiement depuis 60 j",
            description="Vérifie si tu utilises encore ces abonnements ou si tu peux les annuler pour économiser.",
            action_label="Voir abonnements",
            action_url="/abonnements",
        ))

    # 6) Stock bas vs prochaines productions
    LOW = 10
    low_stock = db.execute(
        select(Movement.product_id, func.coalesce(func.sum(Movement.quantity_boxes), 0).label("stock"))
        .group_by(Movement.product_id)
        .having(func.coalesce(func.sum(Movement.quantity_boxes), 0) < LOW)
    ).all()
    if low_stock:
        items.append(AlertItem(
            severity="warning",
            category="inventory",
            title=f"{len(low_stock)} produit(s) sous le seuil de stock bas",
            description=f"Tu as moins de {LOW} boîtes pour certains produits. Programme une production avant rupture.",
            action_label="Voir inventaire",
            action_url="/inventaire",
        ))

    return AlertsReport(generated_at=datetime.now(timezone.utc), alerts=items)
