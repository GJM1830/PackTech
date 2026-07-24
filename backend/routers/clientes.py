from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db, verificar_clave


router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"]
)


@router.post("", response_model=schemas.ClienteResponse)
def crear_cliente(
    cliente: schemas.ClienteCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(verificar_clave)
):
    return crud.crear_cliente(db, cliente)


@router.get("", response_model=list[schemas.ClienteResponse])
def listar_clientes(
    db: Session = Depends(obtener_db)
):
    return crud.obtener_clientes(db)