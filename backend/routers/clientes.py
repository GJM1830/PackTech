from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from database import SessionLocal


router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"]
)


def obtener_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=schemas.ClienteResponse)
def crear_cliente(
    cliente: schemas.ClienteCreate,
    db: Session = Depends(obtener_db)
):
    return crud.crear_cliente(db, cliente)


@router.get("", response_model=list[schemas.ClienteResponse])
def listar_clientes(
    db: Session = Depends(obtener_db)
):
    return crud.obtener_clientes(db)