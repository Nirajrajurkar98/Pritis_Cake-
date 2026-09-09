from sqlalchemy.orm import Session
from app.database.database import SessionLocal, engine
from app.models.product import Product
from app.database.base import Base
import app.models

initial_cakes = [
    {"name": "Strawberry Dream", "category": "Birthday", "price": 850, "image_url": "??", "description": "Layers of vanilla sponge with fresh strawberry cream and glazed strawberries on top.", "weight": "1 kg", "prep_time": "2-3 hrs", "serves": "8-10", "tag": "Bestseller"},
    {"name": "Chocolate Fudge", "category": "Birthday", "price": 950, "image_url": "??", "description": "Rich dark chocolate cake with fudge frosting and chocolate ganache drizzle.", "weight": "1 kg", "prep_time": "2-3 hrs", "serves": "8-10", "tag": "Popular"},
    {"name": "Royal Wedding Cake", "category": "Wedding", "price": 4500, "image_url": "??", "description": "Elegant 3-tier white fondant cake with floral decorations, perfect for your special day.", "weight": "3 kg", "prep_time": "1-2 days", "serves": "30-40", "tag": "Premium"},
    {"name": "Mango Delight", "category": "Seasonal", "price": 780, "image_url": "??", "description": "Fresh mango mousse cake with mango jelly layers and whipped cream.", "weight": "1 kg", "prep_time": "2-3 hrs", "serves": "8-10", "tag": "Seasonal"},
    {"name": "Red Velvet", "category": "Birthday", "price": 900, "image_url": "??", "description": "Classic red velvet with cream cheese frosting, moist and velvety texture.", "weight": "1 kg", "prep_time": "2-3 hrs", "serves": "8-10", "tag": "Classic"},
    {"name": "Unicorn Fantasy", "category": "Kids", "price": 1200, "image_url": "??", "description": "Colorful rainbow layers with unicorn horn decoration, kids absolutely love it!", "weight": "1.5 kg", "prep_time": "3-4 hrs", "serves": "12-15", "tag": "Kids Fav"},
    {"name": "Black Forest", "category": "Birthday", "price": 820, "image_url": "??", "description": "German classic with chocolate sponge, whipped cream and cherries.", "weight": "1 kg", "prep_time": "2-3 hrs", "serves": "8-10", "tag": ""},
    {"name": "Butterscotch Bliss", "category": "Anniversary", "price": 880, "image_url": "??", "description": "Soft butterscotch cake with caramel drizzle and crunchy praline topping.", "weight": "1 kg", "prep_time": "2-3 hrs", "serves": "8-10", "tag": ""},
    {"name": "Pineapple Fresh", "category": "Birthday", "price": 750, "image_url": "??", "description": "Light pineapple sponge with fresh cream and pineapple chunks.", "weight": "1 kg", "prep_time": "2-3 hrs", "serves": "8-10", "tag": ""},
    {"name": "Custom Photo Cake", "category": "Custom", "price": 1500, "image_url": "??", "description": "Personalized cake with edible photo print. Send us your photo and we'll create magic!", "weight": "1.5 kg", "prep_time": "1 day", "serves": "12-15", "tag": "Custom"},
    {"name": "Blueberry Cheesecake", "category": "Anniversary", "price": 1100, "image_url": "??", "description": "New York style cheesecake with fresh blueberry compote topping.", "weight": "1 kg", "prep_time": "4-5 hrs", "serves": "8-10", "tag": ""},
    {"name": "Truffle Royale", "category": "Wedding", "price": 2200, "image_url": "??", "description": "Luxurious chocolate truffle cake with gold leaf decoration for premium occasions.", "weight": "2 kg", "prep_time": "1 day", "serves": "20-25", "tag": "Luxury"}
]

def seed_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        for cake in initial_cakes:
            existing = db.query(Product).filter(Product.name == cake["name"]).first()
            if not existing:
                db.add(Product(**cake))
        db.commit()
        print("Demo products seeded successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
