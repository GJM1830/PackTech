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

@router.get("/{ruc}", response_model=schemas.ClienteResponse)
def obtener_cliente(
    ruc: str,
    db: Session = Depends(obtener_db)
):
    cliente = crud.obtener_cliente_por_ruc(db, ruc)

    if cliente is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=404,
            detail="Cliente no encontrado."
        )

    return cliente

@router.get("/ruc/{ruc}", response_model=schemas.ClienteResponse | None)
def buscar_cliente_por_ruc(
    ruc: str,
    db: Session = Depends(obtener_db)
):
    return (
        db.query(models.Cliente)
        .filter(models.Cliente.ruc == ruc)
        .first()
    )

@router.delete("/{cliente_id}")
def eliminar_cliente(
    cliente_id: int,
    db: Session = Depends(obtener_db),
    _: None = Depends(verificar_clave)
):
    crud.eliminar_cliente(db, cliente_id)
    return {"mensaje": "Cliente eliminado correctamente."}


@router.put("/{cliente_id}", response_model=schemas.ClienteResponse)
def editar_cliente(
    cliente_id: int,
    cliente: schemas.ClienteCreate,
    db: Session = Depends(obtener_db),
    _: None = Depends(verificar_clave)
):
    return crud.editar_cliente(db, cliente_id, cliente)

@router.get("/buscar", response_model=list[schemas.ClienteResponse])
def buscar_clientes(
    q: str,
    db: Session = Depends(obtener_db)
):
    return crud.buscar_clientes(db, q)