from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    category: Optional[str] = Field(None, max_length=50)
    price: float = Field(..., ge=0)
    description: Optional[str] = Field(None, max_length=1000)
    weight: Optional[str] = Field(None, max_length=50)
    serves: Optional[str] = Field(None, max_length=50)
    prep_time: Optional[str] = Field(None, max_length=50)
    tag: Optional[str] = Field(None, max_length=50)
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    category: Optional[str] = Field(None, max_length=50)
    price: Optional[float] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=1000)
    weight: Optional[str] = Field(None, max_length=50)
    serves: Optional[str] = Field(None, max_length=50)
    prep_time: Optional[str] = Field(None, max_length=50)
    tag: Optional[str] = Field(None, max_length=50)
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
