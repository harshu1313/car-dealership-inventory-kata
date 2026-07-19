import os
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Explicitly define the database file path
DATABASE_FILE = "dealership.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///./{DATABASE_FILE}"

# The connect_args are required for SQLite to work correctly with FastAPI multi-threading
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class DBUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="user")

class DBVehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    make = Column(String, index=True)
    model = Column(String, index=True)
    category = Column(String, index=True)
    price = Column(Float)
    quantity = Column(Integer)

# This creates tables ONLY if they do not exist. It will NOT overwrite your data!
Base.metadata.create_all(bind=engine)

def seed_admin():
    db = SessionLocal()
    try:
        admin = db.query(DBUser).filter(DBUser.role == "admin").first()
        if not admin:
            admin_user = DBUser(
                username="system_admin",
                email="admin@dealership.com",
                password_hash=pwd_context.hash("admin123"),
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print("📦 Admin user successfully seeded.")
    except Exception as e:
        print(f"Error seeding admin: {e}")
    finally:
        db.close()

seed_admin()