from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database Configuration
# Defaulting to root/root123 for live environment
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "root123")
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_DB = os.getenv("MYSQL_DB", "dataguardian")

SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"

# Robust fallback to SQLite if MySQL is not reachable
use_sqlite = False
try:
    # Attempt a shallow test of the MySQL connection string
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={'connect_timeout': 2})
    # We test the connection by trying to connect
    with engine.connect() as conn:
        pass
except Exception as e:
    print(f"MySQL connection failed: {e}. Falling back to SQLite.")
    use_sqlite = True

if use_sqlite:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./dataguardian.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
