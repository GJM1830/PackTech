from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db, requiere_rol

router = APIRouter(
    prefix="/movimientos/{movimiento_id}/detalles",
    tags=["Detalles de Movimiento"]
)


@router.post("", response_model=schemas.DetalleMovimientoResponse)
def crear_detalle(
    movimiento_id: int,
    detalle: schemas.DetalleMovimientoCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_alguno_de("admin", "produccion"))
):
    return crud.crear_detalle_movimiento(db, movimiento_id, detalle)


@router.get("", response_model=list[schemas.DetalleMovimientoResponse])
def listar_detalles(
    movimiento_id: int,
    db: Session = Depends(obtener_db)
):
    return crud.obtener_detalles_movimiento(db, movimiento_id)


@router.post("/importar-anteriores", response_model=schemas.ImportarBobinasResponse)
def importar_bobinas_anteriores(
    movimiento_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_alguno_de("admin", "produccion"))
):
    return crud.importar_bobinas_anteriores(db, movimiento_id)