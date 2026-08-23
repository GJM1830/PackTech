from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db, requiere_rol, obtener_usuario_por_clave, SessionLocal

router = APIRouter(
    prefix="/aglomerado",
    tags=["Aglomerado"]
)


@router.post("/movimientos", response_model=schemas.MovimientoAglomeradoResponse)
def crear_movimiento(
    movimiento: schemas.MovimientoAglomeradoCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("produccion"))
):
    return crud.crear_movimiento_aglomerado(db, movimiento)


@router.get("/movimientos", response_model=list[schemas.MovimientoAglomeradoResponse])
def listar_movimientos(
    db: Session = Depends(obtener_db)
):
    return crud.obtener_movimientos_aglomerado(db)


@router.get("/saldo")
def obtener_saldo(
    db: Session = Depends(obtener_db)
):
    return {"saldo": crud.calcular_saldo_aglomerado(db)}


@router.delete("/movimientos/{movimiento_id}")
def eliminar_movimiento(
    movimiento_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("admin"))
):
    crud.eliminar_movimiento_aglomerado(db, movimiento_id)
    return {"mensaje": "Movimiento de aglomerado eliminado correctamente."}


@router.get("/productos/buscar", response_model=list[schemas.ProductoAglomeradoResponse])
def buscar_productos(
    q: str,
    db: Session = Depends(obtener_db)
):
    return crud.buscar_productos_aglomerado(db, q)


@router.get("/clasificaciones/buscar", response_model=list[schemas.ClasificacionAglomeradoResponse])
def buscar_clasificaciones(
    q: str,
    db: Session = Depends(obtener_db)
):
    return crud.buscar_clasificaciones_aglomerado(db, q)    