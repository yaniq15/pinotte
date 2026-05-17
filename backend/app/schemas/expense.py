from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str]


class ExpenseBase(BaseModel):
    category_id: int
    product_id: Optional[int] = None
    batch_id: Optional[int] = None
    amount: Decimal = Field(..., ge=0)
    currency: str = "CAD"
    expense_date: date
    vendor: Optional[str] = Field(None, max_length=200)
    description: str = Field(..., min_length=1)
    receipt_url: Optional[str] = Field(None, max_length=500)


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    amount: Optional[Decimal] = Field(None, ge=0)
    expense_date: Optional[date] = None
    vendor: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None


class ExpenseRead(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str] = None
    product_name: Optional[str] = None
