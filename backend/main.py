import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, DBUser, DBVehicle, pwd_context
import os
import uvicorn

if __name__ == "__main__":
    # Render assigns a dynamic port via environment variables
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

SECRET_KEY = "super-secret-kata-key"
ALGORITHM = "HS256"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class VehicleCreate(BaseModel):
    make: str
    model: str
    category: str
    price: float
    quantity: int

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=2)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = db.query(DBUser).filter(DBUser.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def require_admin(current_user: DBUser = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

@app.post("/api/auth/register", status_code=201)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(DBUser).filter((DBUser.email == user_data.email) | (DBUser.username == user_data.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    new_user = DBUser(
        username=user_data.username,
        email=user_data.email,
        password_hash=pwd_context.hash(user_data.password),
        role="user"
    )
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully"}

@app.post("/api/auth/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == credentials.email).first()
    if not user or not pwd_context.verify(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"token": token, "role": user.role}

@app.get("/api/vehicles")
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(DBVehicle).all()

@app.get("/api/vehicles/search")
def search_vehicles(make: Optional[str] = None, model: Optional[str] = None, category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(DBVehicle)
    if make: query = query.filter(DBVehicle.make.ilike(make))
    if model: query = query.filter(DBVehicle.model.ilike(model))
    if category: query = query.filter(DBVehicle.category.ilike(category))
    return query.all()

@app.post("/api/vehicles/{vehicle_id}/purchase")
def purchase_vehicle(vehicle_id: int, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    vehicle = db.query(DBVehicle).filter(DBVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if vehicle.quantity <= 0:
        raise HTTPException(status_code=400, detail="Vehicle out of stock")
    vehicle.quantity -= 1
    db.commit()
    return {"message": "Purchase successful", "remaining_stock": vehicle.quantity}

@app.post("/api/vehicles", status_code=201)
def add_vehicle(vehicle_data: VehicleCreate, admin: DBUser = Depends(require_admin), db: Session = Depends(get_db)):
    v = DBVehicle(**vehicle_data.dict())
    db.add(v)
    db.commit()
    db.refresh(v)
    return v

@app.delete("/api/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int, admin: DBUser = Depends(require_admin), db: Session = Depends(get_db)):
    vehicle = db.query(DBVehicle).filter(DBVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(vehicle)
    db.commit()
    return {"message": "Vehicle deleted successfully"}

@app.put("/api/vehicles/{vehicle_id}")
def update_vehicle(vehicle_id: int, vehicle_data: VehicleCreate, admin: DBUser = Depends(require_admin), db: Session = Depends(get_db)):
    vehicle = db.query(DBVehicle).filter(DBVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    for key, val in vehicle_data.dict().items():
        setattr(vehicle, key, val)
    db.commit()
    return vehicle

@app.post("/api/vehicles/{vehicle_id}/restock")
def restock_vehicle(    
    vehicle_id: int, 
    amount: int, 
    admin: DBUser = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    vehicle = db.query(DBVehicle).filter(DBVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found in database")
    
    vehicle.quantity += amount
    db.commit()
    return {"message": "Vehicle restocked successfully", "new_stock": vehicle.quantity}