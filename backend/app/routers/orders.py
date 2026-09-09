from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.schemas.order import OrderCreate, OrderStatusUpdate, OrderResponse
from app.models.order import Order, OrderItem
from app.models.cart import CartItem
from app.models.user import User
from app.core.deps import get_current_user, require_admin

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart_items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
        
    total_amount = 0.0
    order_items_to_create = []
    
    for item in cart_items:
        if not item.product or not item.product.is_active:
            raise HTTPException(status_code=400, detail=f"Product '{item.product.name if item.product else item.product_id}' is no longer available")
            
        # SECURITY: Recalculate price from actual database record
        price = item.product.price
        total_amount += price * item.quantity
        
        order_items_to_create.append(
            OrderItem(
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_purchase=price
            )
        )
        
    new_order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        status="Pending"
    )
    db.add(new_order)
    db.flush() # Use flush instead of commit to keep transaction atomic
    
    for oi in order_items_to_create:
        oi.order_id = new_order.id
        db.add(oi)
        
    # Clear cart
    for item in cart_items:
        db.delete(item)
        
    db.commit()
    db.refresh(new_order)
    return new_order

@router.get("", response_model=List[OrderResponse])
def get_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        return db.query(Order).order_by(Order.created_at.desc()).all()
    return db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user.role != "admin" and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
        
    return order

@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(order_id: int, status_update: OrderStatusUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = status_update.status
    db.commit()
    db.refresh(order)
    return order

@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if current_user.role != "admin" and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this order")
        
    if order.status not in ["Pending", "Confirmed"]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled at this stage")
        
    order.status = "Cancelled"
    db.commit()
    db.refresh(order)
    return order

