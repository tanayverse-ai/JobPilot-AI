"""Integration tests for the Feature 1 auth endpoints, using FastAPI's
TestClient against an in-memory MongoDB (mongomock) so no real database is
needed. Run with:

    pip install -r requirements-dev.txt
    pytest

(This suite needs the real fastapi/pymongo/pwdlib packages, which this
sandbox could not install -- see the delivery summary. The equivalent
business logic was already verified here via
tests/_offline_logic_check.py against the shipped app.services.auth_service
and app.core.security modules.)
"""

import mongomock
import pytest
from fastapi.testclient import TestClient

from app.database import get_database
from app.main import app


@pytest.fixture()
def client():
    fake_client = mongomock.MongoClient()
    fake_db = fake_client["jobpilot_ai_test"]

    app.dependency_overrides[get_database] = lambda: fake_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _register(client, email="jane@example.com", password="correcthorsebattery", display_name="Jane Doe"):
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": display_name},
    )


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_register_creates_account_and_returns_token(client):
    response = _register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["user"]["email"] == "jane@example.com"
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_register_duplicate_email_returns_409(client):
    _register(client)
    response = _register(client)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_already_registered"


def test_register_rejects_short_password(client):
    response = _register(client, password="short")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_failed"


def test_login_success_returns_token(client):
    _register(client)
    response = client.post("/api/v1/auth/login", json={"email": "jane@example.com", "password": "correcthorsebattery"})
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_wrong_password_returns_generic_401(client):
    _register(client)
    response = client.post("/api/v1/auth/login", json={"email": "jane@example.com", "password": "wrong-password"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_login_unknown_email_returns_same_generic_401(client):
    response = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_me_requires_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user_with_valid_token(client):
    token = _register(client).json()["access_token"]
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "jane@example.com"


def test_me_rejects_garbage_token(client):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_token"
