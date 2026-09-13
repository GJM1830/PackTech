from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db, requiere_rol

router = APIRouter(
    prefix="/cotizaciones",
    tags=["Cotizaciones"]
)


@router.post("", response_model=schemas.CotizacionResponse)
def crear_cotizacion(
    datos: schemas.CotizacionCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("vendedor"))
):
    return crud.crear_cotizacion(db, datos)


@router.get("", response_model=list[schemas.CotizacionResponse])
def listar_cotizaciones(
    limit: int = 20,
    antes_de: int | None = None,
    db: Session = Depends(obtener_db)
):
    return crud.obtener_cotizaciones(db, limit, antes_de)


@router.get("/buscar", response_model=list[schemas.CotizacionResponse])
def buscar_cotizaciones(
    q: str,
    db: Session = Depends(obtener_db)
):
    return crud.buscar_cotizaciones(db, q)


@router.get("/{cotizacion_id}", response_model=schemas.CotizacionResponse)
def obtener_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(obtener_db)
):
    return crud.obtener_cotizacion_por_id(db, cotizacion_id)


@router.put("/{cotizacion_id}", response_model=schemas.CotizacionResponse)
def editar_cotizacion(
    cotizacion_id: int,
    datos: schemas.CotizacionCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("vendedor"))
):
    return crud.editar_cotizacion(db, cotizacion_id, datos)


@router.delete("/{cotizacion_id}")
def eliminar_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("vendedor"))
):
    crud.eliminar_cotizacion(db, cotizacion_id)
    return {"mensaje": "Cotización eliminada correctamente."}