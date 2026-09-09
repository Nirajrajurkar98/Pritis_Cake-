from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
from app.schemas.product import ProductResponse

class CartItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class CartItemCreate(CartItemBase):
    pass

class CartItemUpdate(BaseModel):
    quantity: int = Field(..., gt=0)

class CartItemResponse(CartItemBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    product: ProductResponse

    class Config:
        from_attributes = True

class CartResponse(BaseModel):
    items: List[CartItemResponse]
    total_price: float
