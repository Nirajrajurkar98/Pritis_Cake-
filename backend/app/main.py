from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, products, cart, orders
from app.database.database import engine
from app.database.base import Base
import app.models  # This imports __init__ to register models

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
