from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db, requiere_rol, requiere_alguno_de

router = APIRouter(
    prefix="",
    tags=["Movimientos"]
)

@router.get("/movimientos/maquinas", response_model=list[str])
def listar_maquinas_unicas(
    db: Session = Depends(obtener_db)
):
    return crud.obtener_maquinas_unicas(db)

@router.post("/movimientos", response_model=schemas.MovimientoResponse)
def crear_movimiento(
    movimiento: schemas.MovimientoCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("produccion"))
):
    return crud.crear_movimiento(db, movimiento)


@router.get("/movimientos", response_model=list[schemas.MovimientoResponse])
def listar_movimientos(
    limit: int = 20,
    antes_de: int | None = None,
    db: Session = Depends(obtener_db)
):
    return crud.obtener_movimientos(db, limit, antes_de)


@router.get("/movimientos/buscar", response_model=list[schemas.MovimientoResponse])
def buscar_movimientos(
    q: str,
    db: Session = Depends(obtener_db)
):
    return crud.buscar_movimientos(db, q)


@router.put("/movimientos/{movimiento_id}", response_model=schemas.MovimientoResponse)
def editar_movimiento(
    movimiento_id: int,
    datos: schemas.MovimientoEditar,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_alguno_de("admin", "produccion"))
):
    return crud.editar_movimiento(db, movimiento_id, datos)


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
    _: None = Depends(requiere_alguno_de("admin", "produccion"))
):
    crud.eliminar_movimiento(db, movimiento_id)
    return {"mensaje": "Movimiento eliminado correctamente."}

@router.delete("/detalles/{detalle_id}")
def eliminar_detalle(
    detalle_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_alguno_de("admin", "produccion"))
):
    crud.eliminar_detalle_movimiento(db, detalle_id)
    return {"mensaje": "Detalle eliminado correctamente."}

@router.post("/movimientos/{movimiento_id}/mermas", response_model=schemas.DetalleMermaResponse)
def crear_detalle_merma(
    movimiento_id: int,
    detalle: schemas.DetalleMermaCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_alguno_de("admin", "produccion"))
):
    return crud.crear_detalle_merma(db, movimiento_id, detalle)


@router.get("/movimientos/{movimiento_id}/mermas", response_model=list[schemas.DetalleMermaResponse])
def listar_detalles_merma(
    movimiento_id: int,
    db: Session = Depends(obtener_db)
):
    return crud.obtener_detalles_merma(db, movimiento_id)


@router.put("/mermas/{detalle_id}", response_model=schemas.DetalleMermaResponse)
def editar_detalle_merma(
    detalle_id: int,
    detalle: schemas.DetalleMermaCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_alguno_de("admin", "produccion"))
):
    return crud.editar_detalle_merma(db, detalle_id, detalle)


@router.delete("/mermas/{detalle_id}")
def eliminar_detalle_merma(
    detalle_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_alguno_de("admin", "produccion"))
):
    crud.eliminar_detalle_merma(db, detalle_id)
    return {"mensaje": "Detalle de merma eliminado correctamente."}

@router.post("/movimientos/siguiente-proceso", response_model=schemas.SiguienteProcesoResponse)
def siguiente_proceso(
    datos: schemas.SiguienteProcesoRequest,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("operario"))
):
    return crud.crear_siguiente_movimiento(db, datos.orden_id)