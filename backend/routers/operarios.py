from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db, verificar_clave


router = APIRouter(
    prefix="/operarios",
    tags=["Operarios"]
)


@router.post("", response_model=schemas.OperarioResponse)
def crear_operario(
    operario: schemas.OperarioCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(verificar_clave)
):
    return crud.crear_operario(db, operario)


@router.get("", response_model=list[schemas.OperarioResponse])
def listar_operarios(
    db: Session = Depends(obtener_db)
):
    return crud.obtener_operarios(db)

@router.delete("/{operario_id}")
def eliminar_operario(
    operario_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(verificar_clave)
):
    crud.eliminar_operario(db, operario_id)
    return {"mensaje": "Operario eliminado correctamente."}

@router.put("/{operario_id}", response_model=schemas.OperarioResponse)
def editar_operario(
    operario_id: int,
    operario: schemas.OperarioCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(verificar_clave)
):
    return crud.editar_operario(db, operario_id, operario)