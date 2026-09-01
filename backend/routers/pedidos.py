from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db, requiere_rol, requiere_alguno_de, obtener_usuario_por_clave, SessionLocal

router = APIRouter(
    prefix="/pedidos",
    tags=["Pedidos"]
)


@router.post("", response_model=schemas.PedidoResponse)
def crear_pedido(
    pedido: schemas.PedidoCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("vendedor"))
):
    return crud.crear_pedido(db, pedido)


@router.get("/preaprobados/listar", response_model=list[schemas.PedidoResponse])
def listar_preaprobados(
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("produccion"))
):
    return crud.obtener_pedidos_preaprobados(db)


@router.get("/{pedido_id}", response_model=schemas.PedidoResponse)
def obtener_pedido(
    pedido_id: int,
    db: Session = Depends(obtener_db)
):
    return crud.obtener_pedido_por_id(db, pedido_id)


@router.put("/{pedido_id}", response_model=schemas.PedidoResponse)
def editar_pedido(
    pedido_id: int,
    datos: schemas.PedidoEditar,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("vendedor"))
):
    return crud.editar_pedido(db, pedido_id, datos)


@router.post("/{pedido_id}/aprobar", response_model=schemas.PedidoResponse)
def aprobar_pedido(
    pedido_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(requiere_rol("vendedor"))
):
    return crud.aprobar_pedido(db, pedido_id)


@router.delete("/{pedido_id}")
def eliminar_pedido(
    pedido_id: int,
    db: Session = Depends(obtener_db),
    x_clave: str = Header(None),
    _: None = Depends(requiere_alguno_de("admin", "vendedor"))
):
    db_auth = SessionLocal()
    try:
        usuario = obtener_usuario_por_clave(db_auth, x_clave)
        rol_usuario = usuario.rol if usuario else ""
    finally:
        db_auth.close()

    crud.eliminar_pedido(db, pedido_id, rol_usuario)
    return {"mensaje": "Pedido eliminado correctamente."}