"""Pytest fixtures — uses a dedicated Postgres database (`chika_test`) so we
don't pollute dev data, and so we get the real BIGINT behavior instead of
SQLite's idiosyncrasies."""
import os
import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://chika:chika_dev_pwd@localhost:5433/chika_test",
)
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-pytest-32-chars-long-key")
os.environ.setdefault("DEBUG", "false")

from sqlalchemy import text                                # noqa: E402
from fastapi.testclient import TestClient                  # noqa: E402

from app.core import database as core_db                   # noqa: E402
import app.models  # noqa: F401, E402  ← registers all tables
import app.main as main_module                             # noqa: E402


def _drop_all_tables():
    """Wipe tables (in dependency order) so tests start from a clean slate."""
    with core_db.engine.begin() as conn:
        # Postgres-friendly bulk drop
        conn.execute(text("""
            DO $$ DECLARE r RECORD;
            BEGIN
              FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema())
              LOOP EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
              END LOOP;
            END $$;
        """))


@pytest.fixture(scope="session", autouse=True)
def _prepare_schema():
    """Drop everything then create fresh schema once for the whole session."""
    _drop_all_tables()
    core_db.Base.metadata.create_all(core_db.engine)
    yield
    _drop_all_tables()


@pytest.fixture(scope="session")
def client():
    """TestClient with the FastAPI lifespan (seed runs at startup)."""
    with TestClient(main_module.app) as c:
        yield c


@pytest.fixture()
def auth_headers(client):
    """Register a fresh user on first call; reuse on subsequent."""
    payload = {"name": "Test User", "email": "test@chika.app", "password": "secret-pwd-12chars"}
    r = client.post("/api/auth/register", json=payload)
    if r.status_code == 409:
        r = client.post("/api/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert r.status_code in (200, 201), r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
