"""Chika FastAPI app entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import auth as auth_routes
from .api.routes import batches as batch_routes
from .api.routes import products as product_routes
from .core.config import settings
from .core.database import SessionLocal
from .core.seed import seed_products


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Idempotent seed at startup so the 3 Chika products always exist.
    with SessionLocal() as db:
        n = seed_products(db)
        if n:
            print(f"[seed] inserted {n} Chika product(s)")
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

    app.include_router(auth_routes.router,    prefix="/api")
    app.include_router(product_routes.router, prefix="/api")
    app.include_router(batch_routes.router,   prefix="/api")

    return app


app = create_app()
