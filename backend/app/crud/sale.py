from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.movement import Movement
from ..models.product import Product
from ..models.sale import Sale, SaleItem, STATUS_TRANSITIONS
from ..models.user import User
from ..schemas.sale import LossRevisionLine, LotPriceRevisionLine, SaleCreate
from . import movement as movement_crud


def list_sales(
    db: Session,
    *,
    client_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[Sale]:
    stmt = select(Sale).order_by(Sale.sale_date.desc(), Sale.id.desc())
    if client_id is not None:
        stmt = stmt.where(Sale.client_id == client_id)
    if status:
        stmt = stmt.where(Sale.status == status)
    if date_from:
        stmt = stmt.where(Sale.sale_date >= date_from)
    if date_to:
        stmt = stmt.where(Sale.sale_date <= date_to)
    # .unique() requis car Sale.items est en lazy="joined" : le SELECT joint
    # sale_items (collection) et SQLAlchemy duplique les Sale parents — il faut
    # dédupliquer explicitement.
    return list(db.scalars(stmt).unique().all())


def get_by_id(db: Session, sale_id: int) -> Optional[Sale]:
    return db.get(Sale, sale_id)


def _current_stock(db: Session, product_id: int) -> int:
    """Live stock for a product = SUM of movements."""
    from sqlalchemy import func
    return int(db.scalar(
        select(func.coalesce(func.sum(Movement.quantity_boxes), 0))
        .where(Movement.product_id == product_id)
    ) or 0)


def create(db: Session, payload: SaleCreate, created_by: User) -> Sale:
    """Atomic creation: sale + items + stock movements, with stock check."""
    # 1. Check stock for each product
    requested_by_product: dict[int, int] = {}
    for it in payload.items:
        requested_by_product[it.product_id] = requested_by_product.get(it.product_id, 0) + it.quantity_boxes

    for product_id, qty in requested_by_product.items():
        product = db.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {product_id} introuvable")
        stock = _current_stock(db, product_id)
        if stock < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuffisant pour « {product.name} » : {qty} boîtes demandées, {stock} en stock",
            )

    # 2. Compute subtotals + total
    items_with_subtotals = []
    total = Decimal("0")
    for it in payload.items:
        subtotal = Decimal(it.unit_price) * it.quantity_boxes
        items_with_subtotals.append((it, subtotal))
        total += subtotal

    # 3. Create sale, items, and SALE movements — all in one transaction
    sale = Sale(
        client_id=payload.client_id,
        created_by=created_by.id,
        sale_date=payload.sale_date,
        status="PENDING",
        total_amount=total,
        currency=payload.currency,
        notes=payload.notes,
    )
    db.add(sale)
    db.flush()

    for it, subtotal in items_with_subtotals:
        item = SaleItem(
            sale_id=sale.id,
            product_id=it.product_id,
            batch_id=it.batch_id,
            quantity_boxes=it.quantity_boxes,
            unit_price=it.unit_price,
            subtotal=subtotal,
        )
        db.add(item)
        db.flush()
        # SALE movement = negative
        db.add(Movement(
            product_id=it.product_id,
            batch_id=it.batch_id,
            created_by=created_by.id,
            movement_type="SALE",
            quantity_boxes=-it.quantity_boxes,
            reference_type="sale_item",
            reference_id=item.id,
            movement_date=payload.sale_date,
            notes=f"Vente #{sale.id}",
        ))

    db.commit()
    db.refresh(sale)
    return sale


def transition_status(
    db: Session, sale: Sale, new_status: str, payment_date: Optional[date], current: User
) -> Sale:
    if new_status == sale.status:
        return sale
    allowed = STATUS_TRANSITIONS.get(sale.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Transition interdite : {sale.status} → {new_status}. Autorisé : {sorted(allowed) or ['(aucune — état final)']}",
        )

    sale.status = new_status
    if new_status == "PAID":
        sale.payment_date = payment_date or date.today()
    if new_status == "CANCELLED":
        # Reintroduce stock via RETURN movements
        for item in sale.items:
            db.add(Movement(
                product_id=item.product_id,
                batch_id=item.batch_id,
                created_by=current.id,
                movement_type="RETURN",
                quantity_boxes=item.quantity_boxes,   # positive — back into stock
                reference_type="sale_item",
                reference_id=item.id,
                movement_date=date.today(),
                notes=f"Annulation vente #{sale.id}",
            ))
    db.commit()
    db.refresh(sale)
    return sale


def _revisable_original_item(sale: Sale, item_id: int) -> SaleItem:
    """Trouve une ligne PRODUCT d'origine de cette vente (pas une ligne de
    révision — on ne révise jamais une révision) ou lève une 404/400."""
    item = next((it for it in sale.items if it.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail=f"Ligne #{item_id} introuvable sur cette vente")
    if item.line_type != "PRODUCT":
        raise HTTPException(
            status_code=400,
            detail=f"La ligne #{item_id} est déjà une révision — impossible de la réviser à nouveau",
        )
    return item


def apply_lot_price_revision(
    db: Session, sale: Sale, lines: list[LotPriceRevisionLine], amount_per_lot: Decimal, reason: str, current: User,
) -> Sale:
    """Ajoute une ligne LOT_ADJUSTMENT par ligne visée — la facture originale
    n'est pas touchée, mais total_amount (somme des lignes) reflète tout de
    suite le vrai montant partout où il est lu (dashboard, PDF, etc.)."""
    if sale.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Impossible de réviser une vente annulée")

    for line in lines:
        original = _revisable_original_item(sale, line.item_id)
        subtotal = Decimal(line.lots) * amount_per_lot
        # .append() (pas db.add) : garde sale.items à jour en mémoire tout de
        # suite, nécessaire pour recalculer total_amount juste après.
        sale.items.append(SaleItem(
            product_id=original.product_id,
            batch_id=None,
            quantity_boxes=line.lots,
            unit_price=amount_per_lot,
            subtotal=subtotal,
            line_type="LOT_ADJUSTMENT",
            notes=reason,
            created_by=current.id,
        ))

    sale.total_amount = sum((it.subtotal for it in sale.items), Decimal("0"))
    db.commit()
    db.refresh(sale)
    return sale


def apply_loss_revision(db: Session, sale: Sale, lines: list[LossRevisionLine], current: User) -> Sale:
    """Ajoute un crédit LOSS_ADJUSTMENT (subtotal négatif) par ligne visée.
    La perte se déclare en UNITÉS (sacs), pas en caisses entières — une
    caisse endommagée n'a souvent que quelques unités abîmées. Le crédit est
    calculé au prorata du prix caisse : unit_price / units_per_box.
    Pas de mouvement de stock ici : les caisses ont déjà quitté l'inventaire
    via le mouvement SALE d'origine — c'est une correction de facturation
    seulement. Si la perte n'a pas encore été déclarée côté stock, il faut
    aussi passer par Mouvements (LOSS) séparément."""
    if sale.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Impossible de réviser une vente annulée")

    for line in lines:
        original = _revisable_original_item(sale, line.item_id)
        upb = original.product.units_per_box
        total_units_invoiced = original.quantity_boxes * upb
        already_credited_units = sum(
            it.quantity_boxes for it in sale.items
            if it.line_type == "LOSS_ADJUSTMENT" and it.product_id == original.product_id and it.batch_id == original.batch_id
        )
        if line.units_lost + already_credited_units > total_units_invoiced:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Impossible de créditer {line.units_lost} unités sur la ligne #{line.item_id} : "
                    f"seulement {total_units_invoiced - already_credited_units} unités facturées restantes (non déjà créditées)"
                ),
            )
        credit_per_unit = original.unit_price / Decimal(upb)
        subtotal = -(Decimal(line.units_lost) * credit_per_unit)
        sale.items.append(SaleItem(
            product_id=original.product_id,
            batch_id=original.batch_id,
            quantity_boxes=line.units_lost,
            unit_price=credit_per_unit,
            subtotal=subtotal,
            line_type="LOSS_ADJUSTMENT",
            notes=line.reason,
            created_by=current.id,
        ))

    sale.total_amount = sum((it.subtotal for it in sale.items), Decimal("0"))
    db.commit()
    db.refresh(sale)
    return sale
