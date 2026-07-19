# import pytest
# from fastapi.testclient import TestClient
# from main import app
# from database import Base, engine, SessionLocal, DBVehicle

# @pytest.fixture(scope="module")
# def test_db():
#     Base.metadata.create_all(bind=engine)
#     db = SessionLocal()
#     test_car = DBVehicle(id=99, make="TestMake", model="TestModel", category="Sedan", price=10000, quantity=1)
#     db.add(test_car)
#     db.commit()
#     yield db
#     Base.metadata.drop_all(bind=engine)
#     db.close()

# client = TestClient(app)

# def test_get_vehicles(test_db):
#     response = client.get("/api/vehicles")
#     assert response.status_code == 200
#     assert len(response.json()) >= 1

# def test_purchase_requires_auth(test_db):
#     response = client.post("/api/vehicles/99/purchase")
#     assert response.status_code == 401

import pytest
from fastapi.testclient import TestClient
from main import app, get_db
from database import Base, engine, SessionLocal, DBUser, DBVehicle, pwd_context

# --- TEST SETUP & FIXTURES ---

@pytest.fixture(scope="module")
def test_db():
    # Force tables to drop and rebuild cleanly for isolation
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 1. Pre-seed standard user
    user = DBUser(
        username="test_buyer",
        email="buyer@test.com",
        password_hash=pwd_context.hash("password123"),
        role="user"
    )
    # 2. Pre-seed admin user
    admin = DBUser(
        username="test_admin",
        email="admin@test.com",
        password_hash=pwd_context.hash("admin123"),
        role="admin"
    )
    # 3. Pre-seed vehicles (One in-stock, one out-of-stock)
    car1 = DBVehicle(id=1, make="Toyota", model="Supra", category="Sports", price=60000.0, quantity=2)
    car2 = DBVehicle(id=2, make="Tesla", model="Model 3", category="Sedan", price=45000.0, quantity=0)
    
    db.add_all([user, admin, car1, car2])
    db.commit()
    
    yield db
    db.close()

client = TestClient(app)

@pytest.fixture
def user_token(test_db):
    response = client.post("/api/auth/login", json={"email": "buyer@test.com", "password": "password123"})
    return response.json()["token"]

@pytest.fixture
def admin_token(test_db):
    response = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    return response.json()["token"]


# =====================================================================
# 🔑 PHASE 1: AUTHENTICATION & ACCESSIBILITY TESTS
# =====================================================================

def test_user_registration_success(test_db):
    """Verify that a brand new user can successfully register"""
    payload = {"username": "new_user", "email": "new@test.com", "password": "securepassword"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["message"] == "User registered successfully"

def test_user_registration_duplicate_fails(test_db):
    """Verify system blocks registering a duplicate email"""
    payload = {"username": "duplicate_user", "email": "buyer@test.com", "password": "password"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400

def test_login_invalid_credentials(test_db):
    """Verify system rejects bad passwords"""
    response = client.post("/api/auth/login", json={"email": "buyer@test.com", "password": "wrongpassword"})
    assert response.status_code == 401


# =====================================================================
# 👤 PHASE 2: USER SHOWERROOM & DASHBOARD TESTS
# =====================================================================

def test_get_all_vehicles(test_db):
    """Verify public endpoint fetches seeded cars correctly"""
    response = client.get("/api/vehicles")
    assert response.status_code == 200
    assert len(response.json()) >= 2

def test_search_vehicles_by_make(test_db):
    """Verify searching for specific brands functions dynamically"""
    response = client.get("/api/vehicles/search?make=Toyota")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["model"] == "Supra"

def test_search_vehicles_no_match(test_db):
    """Verify searching for non-existent criteria yields an empty list safely"""
    response = client.get("/api/vehicles/search?make=Ferrari")
    assert response.status_code == 200
    assert len(response.json()) == 0


# =====================================================================
# ⚡ PHASE 3: VEHICLE ORDERING / PURCHASING TESTS
# =====================================================================

def test_purchase_successful(test_db, user_token):
    """Verify purchasing decreases vehicle inventory count by 1"""
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.post("/api/vehicles/1/purchase", headers=headers)
    assert response.status_code == 200
    assert response.json()["remaining_stock"] == 1

def test_purchase_fails_out_of_stock(test_db, user_token):
    """Verify purchasing fails when quantity reaches 0"""
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.post("/api/vehicles/2/purchase", headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Vehicle out of stock"

def test_purchase_fails_unauthorized(test_db):
    """Verify guest accounts cannot purchase vehicles"""
    response = client.post("/api/vehicles/1/purchase")
    assert response.status_code == 401


# =====================================================================
# 🛠️ PHASE 4: ADMIN CONTROLS & MANAGEMENT TESTS
# =====================================================================

def test_admin_add_vehicle(test_db, admin_token):
    """Verify admin can add items into database"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {"make": "Ford", "model": "Mustang", "category": "Sports", "price": 55000.0, "quantity": 5}
    response = client.post("/api/vehicles", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["model"] == "Mustang"

def test_admin_restock_vehicle(test_db, admin_token):
    """Verify admin can dynamically increment unit quantities"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Hits the post query parameters endpoint we fixed earlier
    response = client.post("/api/vehicles/1/restock?amount=5", headers=headers)
    assert response.status_code == 200
    assert response.json()["new_stock"] == 6

def test_user_cannot_access_admin_routes(test_db, user_token):
    """Verify standard users are blocked from admin CRUD paths (403 Forbidden)"""
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {"make": "Hacker", "model": "Car", "category": "None", "price": 0.0, "quantity": 1}
    response = client.post("/api/vehicles", json=payload, headers=headers)
    assert response.status_code == 403