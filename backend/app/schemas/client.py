from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ClientType = Literal["BROKER", "STORE"]


class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    type: ClientType
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = None
    payment_terms_days: int = Field(30, ge=0, le=365)
    distribution_rate_pct: Optional[Decimal] = Field(None, ge=0, le=1,
        description="Taux de distribution en fraction (0.18 = 18%). BROKER seulement.")
    active: bool = True


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[ClientType] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = None
    payment_terms_days: Optional[int] = Field(None, ge=0, le=365)
    distribution_rate_pct: Optional[Decimal] = Field(None, ge=0, le=1)
    active: Optional[bool] = None


class ClientRead(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
