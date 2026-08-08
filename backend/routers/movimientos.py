from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db, verificar_clave


router = APIRouter(
    prefix="",
    tags=["Movimientos"]
)


@router.post("/movimientos", response_model=schemas.MovimientoResponse)
def crear_movimiento(
    movimiento: schemas.MovimientoCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(verificar_clave)
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

@router.delete("/movimientos/{movimiento_id}")
def eliminar_movimiento(
    movimiento_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(verificar_clave)
):
    crud.eliminar_movimiento(db, movimiento_id)
    return {"mensaje": "Movimiento eliminado correctamente."}

@router.delete("/detalles/{detalle_id}")
def eliminar_detalle(
    detalle_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(verificar_clave)
):
    crud.eliminar_detalle_movimiento(db, detalle_id)
    return {"mensaje": "Detalle eliminado correctamente."}