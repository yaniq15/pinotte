"""Chika FastAPI app entry point."""
from contextlib import asynccontextmanager

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from .api.routes import auth as auth_routes
from .api.routes import batches as batch_routes
from .api.routes import clients as client_routes
from .api.routes import expenses as expense_routes
from .api.routes import inventory as inventory_routes
from .api.routes import materials as material_routes
from .api.routes import movements as movement_routes
from .api.routes import products as product_routes
from .api.routes import recipes as recipe_routes
from .api.routes import reports as report_routes
from .api.routes import sales as sale_routes
from .core.config import settings
from .core.database import SessionLocal
from .core.seed import seed_products
from .core.seed_categories import seed_categories
from .crud import movement as movement_crud
from .models.user import User


@asynccontextmanager
async def lifespan(_: FastAPI):
    with SessionLocal() as db:
        n = seed_products(db)
        if n:
            print(f"[seed] inserted {n} Chika product(s)")
        nc = seed_categories(db)
        if nc:
            print(f"[seed] inserted {nc} expense categor{'y' if nc == 1 else 'ies'}")
        fallback_user = db.scalar(select(User).order_by(User.id).limit(1))
        if fallback_user:
            bf = movement_crud.backfill_production_for_existing_batches(db, fallback_user.id)
            if bf:
                print(f"[backfill] created {bf} PRODUCTION movement(s) for legacy batches")
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    # Static files — uploaded product images served from /uploads/products/*
    upload_dir = Path(os.environ.get("UPLOAD_DIR", "uploads"))
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    app.include_router(auth_routes.router,      prefix="/api")
    app.include_router(product_routes.router,   prefix="/api")
    app.include_router(batch_routes.router,     prefix="/api")
    app.include_router(inventory_routes.router, prefix="/api")
    app.include_router(movement_routes.router,  prefix="/api")
    app.include_router(client_routes.router,    prefix="/api")
    app.include_router(sale_routes.router,      prefix="/api")
    app.include_router(expense_routes.router,   prefix="/api")
    app.include_router(report_routes.router,    prefix="/api")
    app.include_router(recipe_routes.router,    prefix="/api")
    app.include_router(material_routes.router,  prefix="/api")

    return app


app = create_app()
