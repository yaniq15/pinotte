"""Phase 2 + 3 + recipe tests."""


def _create_product(client, auth_headers, **overrides):
    payload = {
        "name": "Test Product", "sku": "TEST-SKU-001",
        "units_per_box": 10, "unit_cost": 1.0,
        "consumer_price": 9.99, "store_margin_pct": 0.35,
        "price_direct": 6.49, "price_broker": 5.32,
        "currency": "CAD", "active": True,
        **overrides,
    }
    r = client.post("/api/products", json=payload, headers=auth_headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_product_crud(client, auth_headers):
    p = _create_product(client, auth_headers, sku="CRUD-001")
    pid = p["id"]
    # READ
    r = client.get(f"/api/products/{pid}", headers=auth_headers)
    assert r.status_code == 200 and r.json()["sku"] == "CRUD-001"
    # UPDATE
    r = client.patch(f"/api/products/{pid}", json={"name": "Renamed"}, headers=auth_headers)
    assert r.status_code == 200 and r.json()["name"] == "Renamed"
    # LIST contains
    r = client.get("/api/products", headers=auth_headers)
    assert any(x["id"] == pid for x in r.json())
    # DELETE — OWNER role is the default for new users → allowed
    r = client.delete(f"/api/products/{pid}", headers=auth_headers)
    assert r.status_code == 204


def test_duplicate_sku_returns_409(client, auth_headers):
    _create_product(client, auth_headers, sku="DUP-SKU")
    r = client.post("/api/products", json={
        "name": "X", "sku": "DUP-SKU", "units_per_box": 1, "currency": "CAD", "active": True,
    }, headers=auth_headers)
    assert r.status_code == 409


def test_batch_creation_generates_production_movement(client, auth_headers):
    p = _create_product(client, auth_headers, sku="BATCH-001", units_per_box=10)
    pid = p["id"]
    r = client.post("/api/batches", json={
        "product_id": pid,
        "batch_number": "L-TEST-001",
        "production_date": "2026-05-17",
        "quantity_boxes": 50,
        "total_cost": 200,
    }, headers=auth_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    # Server computes unit_cost = 200 / (50*10) = 0.40
    assert float(body["unit_cost"]) == 0.40

    # Inventory should reflect +50 boxes for this product
    r = client.get("/api/inventory/current", headers=auth_headers)
    inv = {row["product_id"]: row["stock_boxes"] for row in r.json()}
    assert inv[pid] == 50

    # Movements should include one PRODUCTION linked to the batch
    r = client.get(f"/api/movements?product_id={pid}", headers=auth_headers)
    movs = r.json()
    assert any(m["movement_type"] == "PRODUCTION" and m["quantity_boxes"] == 50 for m in movs)


def test_manual_loss_decrements_stock(client, auth_headers):
    p = _create_product(client, auth_headers, sku="LOSS-001")
    client.post("/api/batches", json={
        "product_id": p["id"], "batch_number": "L-LOSS-001",
        "production_date": "2026-05-17", "quantity_boxes": 100, "total_cost": 100,
    }, headers=auth_headers)
    r = client.post("/api/movements", json={
        "product_id": p["id"],
        "movement_type": "LOSS",
        "quantity_boxes": -5,
        "movement_date": "2026-05-17",
        "notes": "Cartons abimes",
    }, headers=auth_headers)
    assert r.status_code == 201, r.text
    inv = {row["product_id"]: row["stock_boxes"] for row in
           client.get("/api/inventory/current", headers=auth_headers).json()}
    assert inv[p["id"]] == 95


def test_loss_must_be_negative(client, auth_headers):
    p = _create_product(client, auth_headers, sku="LOSS-POS")
    r = client.post("/api/movements", json={
        "product_id": p["id"],
        "movement_type": "LOSS",
        "quantity_boxes": 5,  # positive — invalid for LOSS
        "movement_date": "2026-05-17",
        "notes": "test",
    }, headers=auth_headers)
    assert r.status_code == 400


def test_recipe_cost_per_unit(client, auth_headers):
    p = _create_product(client, auth_headers, sku="RECIPE-001", units_per_box=12)
    r = client.put(f"/api/products/{p['id']}/recipe", json={
        "batch_yield_units": 8,
        "ingredients": [
            {"name": "Peanut paste", "unit": "g", "quantity": 1000, "unit_price": 0.01},
            {"name": "Water",        "unit": "g", "quantity": 500,  "unit_price": 0.0001},
        ],
    }, headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    # total = 1000*0.01 + 500*0.0001 = 10 + 0.05 = 10.05
    assert float(body["total_batch_cost"]) == 10.05
    # cost_per_unit = 10.05 / 8 = 1.25625 (banker's rounding @ 4 decimals → 1.2562)
    assert abs(float(body["cost_per_unit"]) - 1.25625) < 0.0001
    # cost_per_box ≈ 1.25625 * 12 = 15.075 → quantized to 2 decimals
    assert abs(float(body["cost_per_box"]) - 15.07) < 0.01

    # Apply → product.unit_cost is updated (rounded to 2 decimals)
    r = client.post(f"/api/products/{p['id']}/recipe/apply-cost", headers=auth_headers)
    assert r.status_code == 200
    r = client.get(f"/api/products/{p['id']}", headers=auth_headers)
    assert float(r.json()["unit_cost"]) == 1.26  # 1.2563 → 1.26 quantized
