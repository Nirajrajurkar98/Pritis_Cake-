from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartResponse, CartItemResponse
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/cart", tags=["cart"])

@router.get("", response_model=CartResponse)
def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    total_price = 0.0
    for item in items:
        # Check if product is still active, ignore price if inactive?
        if item.product and item.product.is_active:
            total_price += item.product.price * item.quantity
    return {"items": items, "total_price": total_price}

@router.post("/items", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(item_in: CartItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == item_in.product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=400, detail="Product not found or inactive")
        
    existing_item = db.query(CartItem).filter(
        CartItem.user_id == current_user.id, 
        CartItem.product_id == item_in.product_id
    ).first()
    
    if existing_item:
        existing_item.quantity += item_in.quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item
        
    new_item = CartItem(
        user_id=current_user.id,
        product_id=item_in.product_id,
        quantity=item_in.quantity
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/items/{product_id}", response_model=CartItemResponse)
def update_cart_item(product_id: int, item_in: CartItemUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(
        CartItem.user_id == current_user.id, 
        CartItem.product_id == product_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")
        
    item.quantity = item_in.quantity
    db.commit()
    db.refresh(item)
    return item

@router.delete("/items/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(product_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(
        CartItem.user_id == current_user.id, 
        CartItem.product_id == product_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")
        
    db.delete(item)
    db.commit()
    return

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    db.commit()
    return
