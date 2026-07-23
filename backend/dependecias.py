from database import SessionLocal


def obtener_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()