def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register_then_login_then_me(client):
    r = client.post("/api/auth/register", json={
        "name": "Alice", "email": "alice@chika.app", "password": "s3cret-pwd-123",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert "access_token" in body and body["user"]["email"] == "alice@chika.app"
    token = body["access_token"]

    r2 = client.post("/api/auth/login", json={"email": "alice@chika.app", "password": "s3cret-pwd-123"})
    assert r2.status_code == 200

    r3 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r3.status_code == 200
    assert r3.json()["email"] == "alice@chika.app"
    assert r3.json()["role"] == "OWNER"


def test_register_duplicate_email_returns_409(client):
    payload = {"name": "Bob", "email": "bob@chika.app", "password": "another-pwd"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "name": "Carol", "email": "carol@chika.app", "password": "real-pwd-xyz",
    })
    r = client.post("/api/auth/login", json={"email": "carol@chika.app", "password": "wrong"})
    assert r.status_code == 401


def test_protected_route_without_token_is_401(client):
    assert client.get("/api/products").status_code == 401
