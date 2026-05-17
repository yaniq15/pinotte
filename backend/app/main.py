"""Chika FastAPI app entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import auth as auth_routes
from .api.routes import batches as batch_routes
from .api.routes import inventory as inventory_routes
from .api.routes import movements as movement_routes
from .api.routes import products as product_routes
from .core.config import settings
from .core.database import SessionLocal
from .core.seed import seed_products
from .crud import movement as movement_crud
from .models.user import User
from sqlalchemy import select


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Idempotent seed at startup so the 3 Chika products always exist.
    with SessionLocal() as db:
        n = seed_products(db)
        if n:
            print(f"[seed] inserted {n} Chika product(s)")
        # Phase 3 backfill — make sure pre-Phase-3 batches have a PRODUCTION movement.
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

    app.include_router(auth_routes.router,      prefix="/api")
    app.include_router(product_routes.router,   prefix="/api")
    app.include_router(batch_routes.router,     prefix="/api")
    app.include_router(inventory_routes.router, prefix="/api")
    app.include_router(movement_routes.router,  prefix="/api")

    return app


app = create_app()
