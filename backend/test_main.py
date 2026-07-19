import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal, DBVehicle

@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    test_car = DBVehicle(id=99, make="TestMake", model="TestModel", category="Sedan", price=10000, quantity=1)
    db.add(test_car)
    db.commit()
    yield db
    Base.metadata.drop_all(bind=engine)
    db.close()

client = TestClient(app)

def test_get_vehicles(test_db):
    response = client.get("/api/vehicles")
    assert response.status_code == 200
    assert len(response.json()) >= 1

def test_purchase_requires_auth(test_db):
    response = client.post("/api/vehicles/99/purchase")
    assert response.status_code == 401