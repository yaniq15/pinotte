from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class IngredientIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    unit: str = Field("g", min_length=1, max_length=20)
    quantity: Decimal = Field(..., ge=0)
    unit_price: Optional[Decimal] = Field(None, ge=0,
        description="Prix par UNE unité (par g, par ml, etc. selon `unit`).")
    notes: Optional[str] = None
    sort_order: int = 0


class IngredientOut(IngredientIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    line_cost: Optional[Decimal] = None  # computed: quantity * unit_price


class RecipePut(BaseModel):
    """Full replacement of a product's recipe in one PUT."""
    batch_yield_units: Optional[int] = Field(None, ge=1,
        description="Nb d'unités produites par UN batch (ex: 8 bocaux par batch de Mafé).")
    ingredients: list[IngredientIn] = Field(default_factory=list)


class RecipeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: int
    product_name: str
    units_per_box: int
    batch_yield_units: Optional[int] = None
    ingredients: list[IngredientOut] = Field(default_factory=list)
    # Computed summary:
    total_batch_cost: Decimal = Decimal("0")
    cost_per_unit: Optional[Decimal] = None
    cost_per_box: Optional[Decimal] = None
    current_unit_cost: Optional[Decimal] = None  # what is stored on Product.unit_cost
