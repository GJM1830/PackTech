import os
from fastapi import Header, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
import models

# Jerarquía de mayor a menor. Se usa para reglas tipo "rol mínimo X y superiores".
JERARQUIA = {"observador": 1, "produccion": 2, "vendedor": 3, "admin": 4}


def obtener_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def obtener_usuario_por_clave(db: Session, clave: str):
    return db.query(models.Usuario).filter(models.Usuario.clave == clave).first()


def _validar_usuario(x_clave: str) -> models.Usuario:
    db = SessionLocal()
    try:
        usuario = obtener_usuario_por_clave(db, x_clave)
        if usuario is None:
            raise HTTPException(status_code=401, detail="Clave incorrecta o faltante.")
        return usuario
    finally:
        db.close()


def requiere_rol(rol_minimo: str):
    """
    Uso normal: exige el rol indicado O CUALQUIERA superior en la jerarquía.
    Ejemplo: requiere_rol("vendedor") deja pasar a vendedor y admin.
    """
    def verificador(x_clave: str = Header(None)):
        usuario = _validar_usuario(x_clave)

        if JERARQUIA.get(usuario.rol, 0) < JERARQUIA.get(rol_minimo, 99):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para realizar esta acción."
            )

    return verificador


def requiere_alguno_de(*roles_permitidos: str):
    """
    Excepción a la jerarquía: solo deja pasar a los roles listados explícitamente,
    sin importar su posición en JERARQUIA.
    Ejemplo real: editar/eliminar Movimientos lo puede hacer Admin o Producción,
    pero NO Vendedor, aunque Vendedor esté por encima de Producción en rango.
    """
    def verificador(x_clave: str = Header(None)):
        usuario = _validar_usuario(x_clave)

        if usuario.rol not in roles_permitidos:
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para realizar esta acción."
            )

    return verificador


# Compatibilidad: usado donde solo se necesita confirmar que hay clave válida (cualquier rol)
def verificar_clave(x_clave: str = Header(None)):
    return requiere_rol("observador")(x_clave)