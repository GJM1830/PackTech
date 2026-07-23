from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from database import SessionLocal


router = APIRouter(
    prefix="",
    tags=["Movimientos"]
)


def obtener_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/movimientos", response_model=schemas.MovimientoResponse)
def crear_movimiento(
    movimiento: schemas.MovimientoCreate,
    db: Session = Depends(obtener_db)
):
    return crud.crear_movimiento(db, movimiento)


@router.get("/movimientos", response_model=list[schemas.MovimientoResponse])
def listar_movimientos(
    db: Session = Depends(obtener_db)
):
    return crud.obtener_movimientos(db)


@router.get(
    "/ordenes-produccion/{orden_id}/movimientos",
    response_model=list[schemas.MovimientoResponse]
)
def listar_movimientos_por_orden(
    orden_id: int,
    db: Session = Depends(obtener_db)
):
    return crud.obtener_movimientos_por_orden(db, orden_id)