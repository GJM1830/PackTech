from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from database import SessionLocal


router = APIRouter(
    prefix="/operarios",
    tags=["Operarios"]
)


def obtener_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=schemas.OperarioResponse)
def crear_operario(
    operario: schemas.OperarioCreate,
    db: Session = Depends(obtener_db)
):
    return crud.crear_operario(db, operario)


@router.get("", response_model=list[schemas.OperarioResponse])
def listar_operarios(
    db: Session = Depends(obtener_db)
):
    return crud.obtener_operarios(db)