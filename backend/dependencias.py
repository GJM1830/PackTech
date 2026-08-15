import os
from fastapi import Header, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import models

JERARQUIA = {"lector": 1, "operario": 2, "admin": 3}


def obtener_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def obtener_usuario_por_clave(db: Session, clave: str):
    return db.query(models.Usuario).filter(models.Usuario.clave == clave).first()


def requiere_rol(rol_minimo: str):
    def verificador(x_clave: str = Header(None)):
        db = SessionLocal()
        try:
            usuario = obtener_usuario_por_clave(db, x_clave)
            if usuario is None:
                raise HTTPException(status_code=401, detail="Clave incorrecta o faltante.")

            if JERARQUIA.get(usuario.rol, 0) < JERARQUIA.get(rol_minimo, 99):
                raise HTTPException(
                    status_code=403,
                    detail="No tienes permiso para realizar esta acción."
                )
        finally:
            db.close()

    return verificador


# Compatibilidad: usado donde solo se necesita confirmar que hay clave válida (cualquier rol)
def verificar_clave(x_clave: str = Header(None)):
    return requiere_rol("lector")(x_clave)