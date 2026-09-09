import argparse
import getpass
from sqlalchemy.orm import Session
from app.database.database import SessionLocal, engine
from app.models.user import User
from app.core.security import get_password_hash
from app.database.base import Base
import app.models

def create_admin():
    # Ensure tables are created just in case
    Base.metadata.create_all(bind=engine)
    
    print("--- Create Admin User ---")
    name = input("Admin Name: ")
    email = input("Admin Email: ")
    password = getpass.getpass("Admin Password: ")
    
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print("Error: A user with this email already exists.")
            return
            
        hashed_password = get_password_hash(password)
        db_user = User(
            name=name,
            email=email,
            password_hash=hashed_password,
            role="admin"
        )
        db.add(db_user)
        db.commit()
        print(f"Admin user {email} created successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
