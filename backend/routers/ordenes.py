from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas

from dependencias import obtener_db, requiere_rol
from pydantic import BaseModel  


router = APIRouter(
    prefix="/ordenes-produccion",
    tags=["Órdenes de Producción"]
)


@router.post("", response_model=schemas.OrdenProduccionResponse)
def crear_orden(
    orden: schemas.OrdenProduccionCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("produccion"))
):
    return crud.crear_orden_produccion(db, orden)


@router.get("", response_model=list[schemas.OrdenProduccionResponse])
def listar_ordenes(
    limit: int = 20,
    antes_de: int | None = None,
    db: Session = Depends(obtener_db)
):
    return crud.obtener_ordenes_produccion(db, limit, antes_de)

@router.delete("/{orden_id}")
def eliminar_orden(
    orden_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("admin"))
):
    crud.eliminar_orden_produccion(db, orden_id)
    return {"mensaje": "Orden eliminada correctamente."}

class ProcesosUpdate(BaseModel):
    procesos_plan: str

@router.get("/vendedores/buscar", response_model=list[schemas.VendedorResponse])
def buscar_vendedores(
    q: str,
    db: Session = Depends(obtener_db)
):
    return crud.buscar_vendedores(db, q)

@router.get("/buscar", response_model=list[schemas.OrdenProduccionResponse])
def buscar_ordenes(
    q: str,
    db: Session = Depends(obtener_db)
):
    return crud.buscar_ordenes(db, q)

@router.put("/{orden_id}/procesos", response_model=schemas.OrdenProduccionResponse)
def actualizar_procesos(
    orden_id: int,
    datos: ProcesosUpdate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("produccion"))
):
    return crud.actualizar_procesos_plan(db, orden_id, datos.procesos_plan)

@router.put("/{orden_id}", response_model=schemas.OrdenProduccionResponse)
def editar_orden(
    orden_id: int,
    orden: schemas.OrdenProduccionCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("admin"))
):
    return crud.editar_orden_produccion(db, orden_id, orden)

@router.get("/preaprobadas/listar", response_model=list[schemas.OrdenProduccionResponse])
def listar_preaprobadas(
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("produccion"))
):
    return crud.obtener_ordenes_preaprobadas(db)


@router.post("/{orden_id}/aprobar", response_model=schemas.OrdenProduccionResponse)
def aprobar_orden(
    orden_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("vendedor"))
):
    return crud.aprobar_orden_preaprobada(db, orden_id)