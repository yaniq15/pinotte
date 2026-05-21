from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str]
    account_code: Optional[str] = None
    expense_type: str = "OPEX"


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
    # Taxes payées (récupérables comme CTI/RTI)
    tps_paid: Optional[Decimal] = Field(None, ge=0)
    tvq_paid: Optional[Decimal] = Field(None, ge=0)
    vendor_tps_number: Optional[str] = Field(None, max_length=30)
    vendor_tvq_number: Optional[str] = Field(None, max_length=30)
    # Type comptable (override sur la catégorie). None → hérite de category.expense_type
    expense_type: Optional[str] = Field(None, pattern="^(COGS|OPEX|CAPEX)$")
    is_recurring: bool = False
    recurrence_frequency: Optional[str] = Field(None, pattern="^(monthly|quarterly|yearly)$")
    cca_class: Optional[str] = Field(None, max_length=5)
    deductibility_pct: int = Field(100, ge=0, le=100)


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
    tps_paid: Optional[Decimal] = Field(None, ge=0)
    tvq_paid: Optional[Decimal] = Field(None, ge=0)
    vendor_tps_number: Optional[str] = Field(None, max_length=30)
    vendor_tvq_number: Optional[str] = Field(None, max_length=30)
    expense_type: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_frequency: Optional[str] = None
    cca_class: Optional[str] = None
    deductibility_pct: Optional[int] = Field(None, ge=0, le=100)


class ExpenseRead(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str] = None
    product_name: Optional[str] = None
