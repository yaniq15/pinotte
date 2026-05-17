"""Phase 4 tests — clients, sales, status transitions, stock check, cancellation."""
import uuid

import pytest


@pytest.fixture()
def setup(client, auth_headers):
    """Create 1 product + 1 client + a batch of 100 boxes — returns ids.
    Uses a unique SKU per test to avoid 409 collisions across tests in the same session."""
    tag = uuid.uuid4().hex[:6].upper()
    p = client.post("/api/products", json={
        "name": f"Sale Test {tag}", "sku": f"SALE-{tag}",
        "units_per_box": 10, "unit_cost": 1.0,
        "consumer_price": 9.99, "store_margin_pct": 0.35,
        "price_direct": 6.49, "price_broker": 5.32,
        "currency": "CAD", "active": True,
    }, headers=auth_headers).json()
    c = client.post("/api/clients", json={
        "name": f"Lambert Test {tag}", "type": "BROKER", "payment_terms_days": 30,
        "distribution_rate_pct": 0.18, "active": True,
    }, headers=auth_headers).json()
    client.post("/api/batches", json={
        "product_id": p["id"], "batch_number": f"L-{tag}",
        "production_date": "2026-05-17", "quantity_boxes": 100, "total_cost": 100,
    }, headers=auth_headers)
    return {"product_id": p["id"], "client_id": c["id"]}


def test_create_sale_decrements_stock(client, auth_headers, setup):
    r = client.post("/api/sales", json={
        "client_id": setup["client_id"],
        "sale_date": "2026-05-17",
        "items": [{"product_id": setup["product_id"], "quantity_boxes": 20, "unit_price": 5.32}],
    }, headers=auth_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "PENDING"
    assert float(body["total_amount"]) == 20 * 5.32

    inv = {row["product_id"]: row["stock_boxes"] for row in
           client.get("/api/inventory/current", headers=auth_headers).json()}
    assert inv[setup["product_id"]] == 80  # 100 - 20


def test_sale_refused_when_insufficient_stock(client, auth_headers, setup):
    r = client.post("/api/sales", json={
        "client_id": setup["client_id"],
        "sale_date": "2026-05-17",
        "items": [{"product_id": setup["product_id"], "quantity_boxes": 9999, "unit_price": 5.32}],
    }, headers=auth_headers)
    assert r.status_code == 400
    assert "stock" in r.json()["detail"].lower()


def test_status_transitions_happy_path(client, auth_headers, setup):
    sale = client.post("/api/sales", json={
        "client_id": setup["client_id"], "sale_date": "2026-05-17",
        "items": [{"product_id": setup["product_id"], "quantity_boxes": 5, "unit_price": 5.32}],
    }, headers=auth_headers).json()
    sid = sale["id"]
    # PENDING → DELIVERED
    r = client.patch(f"/api/sales/{sid}/status", json={"status": "DELIVERED"}, headers=auth_headers)
    assert r.status_code == 200 and r.json()["status"] == "DELIVERED"
    # DELIVERED → PAID + payment_date auto
    r = client.patch(f"/api/sales/{sid}/status", json={"status": "PAID"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "PAID"
    assert r.json()["payment_date"] is not None


def test_invalid_status_transition_is_rejected(client, auth_headers, setup):
    sale = client.post("/api/sales", json={
        "client_id": setup["client_id"], "sale_date": "2026-05-17",
        "items": [{"product_id": setup["product_id"], "quantity_boxes": 5, "unit_price": 5.32}],
    }, headers=auth_headers).json()
    sid = sale["id"]
    # Bring to PAID
    client.patch(f"/api/sales/{sid}/status", json={"status": "DELIVERED"}, headers=auth_headers)
    client.patch(f"/api/sales/{sid}/status", json={"status": "PAID"}, headers=auth_headers)
    # PAID → PENDING is forbidden
    r = client.patch(f"/api/sales/{sid}/status", json={"status": "PENDING"}, headers=auth_headers)
    assert r.status_code == 400


def test_cancel_restores_stock(client, auth_headers, setup):
    sale = client.post("/api/sales", json={
        "client_id": setup["client_id"], "sale_date": "2026-05-17",
        "items": [{"product_id": setup["product_id"], "quantity_boxes": 30, "unit_price": 5.32}],
    }, headers=auth_headers).json()
    # After sale : 100 - 30 = 70
    inv = {row["product_id"]: row["stock_boxes"] for row in
           client.get("/api/inventory/current", headers=auth_headers).json()}
    assert inv[setup["product_id"]] == 70

    # Cancel → RETURN movement +30 → stock back to 100
    r = client.patch(f"/api/sales/{sale['id']}/status", json={"status": "CANCELLED"}, headers=auth_headers)
    assert r.status_code == 200
    inv = {row["product_id"]: row["stock_boxes"] for row in
           client.get("/api/inventory/current", headers=auth_headers).json()}
    assert inv[setup["product_id"]] == 100
