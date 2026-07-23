from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from database import SessionLocal


router = APIRouter(
    prefix="/ordenes-produccion",
    tags=["Órdenes de Producción"]
)


def obtener_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=schemas.OrdenProduccionResponse)
def crear_orden(
    orden: schemas.OrdenProduccionCreate,
    db: Session = Depends(obtener_db)
):
    return crud.crear_orden_produccion(db, orden)


@router.get("", response_model=list[schemas.OrdenProduccionResponse])
def listar_ordenes(
    db: Session = Depends(obtener_db)
):
    return crud.obtener_ordenes_produccion(db)