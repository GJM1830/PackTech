from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db


router = APIRouter(
    prefix="/tipos-merma",
    tags=["Tipos de Merma"]
)


@router.get("/buscar", response_model=list[schemas.TipoMermaResponse])
def buscar_tipos_merma(
    proceso: str,
    q: str,
    db: Session = Depends(obtener_db)
):
    return crud.buscar_tipos_merma(db, proceso, q)