from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from app.schemas.product import ProductResponse

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_purchase: float
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    pass

class OrderCreate(OrderBase):
    pass # Items pulled from backend cart

class OrderStatusUpdate(BaseModel):
    status: Literal['Pending', 'Confirmed', 'Baking', 'Delivered', 'Cancelled']

class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True

