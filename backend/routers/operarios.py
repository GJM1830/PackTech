from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db, requiere_rol

router = APIRouter(
    prefix="/operarios",
    tags=["Operarios"]
)


@router.post("", response_model=schemas.OperarioResponse)
def crear_operario(
    operario: schemas.OperarioCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("operario"))
):
    return crud.crear_operario(db, operario)


@router.get("", response_model=list[schemas.OperarioResponse])
def listar_operarios(
    limit: int = 20,
    antes_de: int | None = None,
    db: Session = Depends(obtener_db)
):
    return crud.obtener_operarios(db, limit, antes_de)

@router.delete("/{operario_id}")
def eliminar_operario(
    operario_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("operario"))
):
    crud.eliminar_operario(db, operario_id)
    return {"mensaje": "Operario eliminado correctamente."}

@router.put("/{operario_id}", response_model=schemas.OperarioResponse)
def editar_operario(
    operario_id: int,
    operario: schemas.OperarioCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("operario"))
):
    return crud.editar_operario(db, operario_id, operario)

@router.get("/buscar", response_model=list[schemas.OperarioResponse])
def buscar_operarios(
    q: str,
    db: Session = Depends(obtener_db)
):
    return crud.buscar_operarios(db, q)