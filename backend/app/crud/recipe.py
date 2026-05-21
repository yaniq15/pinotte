from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from ..models.product import Product, ProductIngredient
from ..schemas.recipe import IngredientOut, RecipeOut, RecipePut


def _compute_line_cost(ing: ProductIngredient) -> Optional[Decimal]:
    if ing.unit_price is None or ing.quantity is None:
        return None
    return (ing.quantity * ing.unit_price).quantize(Decimal("0.0001"))


def get_recipe(db: Session, product: Product) -> RecipeOut:
    items: list[IngredientOut] = []
    total = Decimal("0")
    any_priced = False
    for ing in product.ingredients:
        line = _compute_line_cost(ing)
        if line is not None:
            total += line
            any_priced = True
        # Données de la matière liée (si lien actif) pour l'affichage UI
        m = ing.material
        items.append(IngredientOut.model_validate({
            **{k: v for k, v in ing.__dict__.items() if not k.startswith("_")},
            "line_cost": line,
            "material_name": m.name if m else None,
            "material_unit": m.unit if m else None,
            "material_current_stock": m.current_stock if m else None,
            "material_pmp": m.weighted_avg_price if m else None,
        }))
    cost_per_unit: Optional[Decimal] = None
    cost_per_box: Optional[Decimal] = None
    if any_priced and product.batch_yield_units and product.batch_yield_units > 0:
        cost_per_unit = (total / Decimal(product.batch_yield_units)).quantize(Decimal("0.0001"))
        cost_per_box = (cost_per_unit * Decimal(product.units_per_box)).quantize(Decimal("0.01"))
    return RecipeOut(
        product_id=product.id,
        product_name=product.name,
        units_per_box=product.units_per_box,
        batch_yield_units=product.batch_yield_units,
        ingredients=items,
        total_batch_cost=total.quantize(Decimal("0.01")) if any_priced else Decimal("0"),
        cost_per_unit=cost_per_unit,
        cost_per_box=cost_per_box,
        current_unit_cost=product.unit_cost,
    )


def put_recipe(db: Session, product: Product, payload: RecipePut) -> Product:
    """Replace the recipe wholesale: clear all ingredients, insert the new set,
    update batch_yield_units. Does NOT update unit_cost — that's a separate
    explicit action via apply_cost()."""
    product.batch_yield_units = payload.batch_yield_units
    product.ingredients.clear()
    for i, ing in enumerate(payload.ingredients):
        product.ingredients.append(ProductIngredient(
            name=ing.name.strip(),
            unit=ing.unit.strip(),
            quantity=ing.quantity,
            unit_price=ing.unit_price,
            notes=ing.notes,
            sort_order=ing.sort_order if ing.sort_order else i,
            material_id=ing.material_id,
        ))
    db.commit()
    db.refresh(product)
    return product


def apply_cost(db: Session, product: Product) -> Product:
    """Recompute cost_per_unit and write it to product.unit_cost."""
    recipe = get_recipe(db, product)
    if recipe.cost_per_unit is None:
        raise ValueError("Impossible de calculer le coût unitaire (recette ou prix manquants)")
    product.unit_cost = recipe.cost_per_unit.quantize(Decimal("0.01"))
    db.commit()
    db.refresh(product)
    return product
