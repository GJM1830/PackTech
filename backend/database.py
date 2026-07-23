from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "postgresql://postgres:packtech123@127.0.0.1:5432/PackTech"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autoflush=False,
    autocommit=False,
    bind=engine
)

class Base(DeclarativeBase):
    pass