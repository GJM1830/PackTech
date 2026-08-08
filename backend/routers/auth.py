from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import schemas
from dependencias import obtener_db, obtener_usuario_por_clave


router = APIRouter(tags=["Autenticación"])


@router.post("/login", response_model=schemas.LoginResponse)
def login(datos: schemas.LoginRequest, db: Session = Depends(obtener_db)):
    usuario = obtener_usuario_por_clave(db, datos.clave)
    if usuario is None:
        raise HTTPException(status_code=401, detail="Clave incorrecta.")
    return usuario