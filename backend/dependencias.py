import os
from fastapi import Header, HTTPException

from database import SessionLocal

CLAVE_SISTEMA = os.getenv("CLAVE_SISTEMA", "packtech2026")


def obtener_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verificar_clave(x_clave: str = Header(None)):
    if x_clave != CLAVE_SISTEMA:
        raise HTTPException(status_code=401, detail="Clave incorrecta o faltante.")