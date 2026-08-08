from sqlalchemy.orm import Session
from fastapi import HTTPException

import models
import schemas

def crear_cliente(
    db: Session,
    cliente: schemas.ClienteCreate
):
    cliente_existente = (
        db.query(models.Cliente)
        .filter(models.Cliente.ruc == cliente.ruc)
        .first()
    )

    if cliente_existente is not None:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un cliente con ese RUC."
        )

    nuevo_cliente = models.Cliente(
        ruc=cliente.ruc,
        nombre=cliente.nombre
    )

    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)

    return nuevo_cliente


def obtener_clientes(db: Session):
    return db.query(models.Cliente).all()

def crear_orden_produccion(
    db: Session,
    orden: schemas.OrdenProduccionCreate
):
    cliente = (
        db.query(models.Cliente)
        .filter(models.Cliente.ruc == orden.ruc)
        .first()
    )

    if cliente is None:
        if not orden.nombre_cliente:
            raise HTTPException(
                status_code=400,
                detail="Cliente no encontrado. Debe ingresar el nombre."
            )

        cliente = models.Cliente(
            ruc=orden.ruc,
            nombre=orden.nombre_cliente
        )

        db.add(cliente)
        db.commit()
        db.refresh(cliente)

    orden_existente = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.codigo == orden.codigo)
        .first()
    )

    if orden_existente:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una Orden de Producción con ese código."
        )

    nueva_orden = models.OrdenProduccion(
        codigo=orden.codigo,
        cliente_id=cliente.id,
        numero_std=orden.numero_std,
        descripcion=orden.descripcion,
        cantidad=orden.cantidad,
        unidad=orden.unidad,
        estado=orden.estado
    )

    db.add(nueva_orden)
    db.commit()
    db.refresh(nueva_orden)

    nueva_orden.ruc = cliente.ruc
    nueva_orden.cliente = cliente.nombre

    return nueva_orden

def calcular_estado(proceso: str | None) -> str:
    if proceso is None:
        return "Pendiente"
    if proceso == "Despacho":
        return "Terminado"
    if proceso == "Almacén":
        return "En almacén"
    return "En proceso"


def obtener_ordenes_produccion(db: Session):
    ordenes = db.query(models.OrdenProduccion).all()

    for orden in ordenes:
        orden.ruc = orden.cliente_obj.ruc
        orden.cliente = orden.cliente_obj.nombre

        ultimo_movimiento = (
            db.query(models.Movimiento)
            .filter(models.Movimiento.orden_id == orden.id)
            .order_by(models.Movimiento.id.desc())
            .first()
        )

        proceso_actual = ultimo_movimiento.proceso if ultimo_movimiento else None
        orden.ultimo_proceso = proceso_actual or "Sin iniciar"
        orden.estado = calcular_estado(proceso_actual)

    return ordenes


def crear_movimiento(
    db: Session,
    movimiento: schemas.MovimientoCreate
):
    orden = db.get(models.OrdenProduccion, movimiento.orden_id)
    if orden is None:
        raise HTTPException(
            status_code=404,
            detail="La Orden de Producción no existe."
        )

    operario = db.get(models.Operario, movimiento.operario_id)
    if operario is None:
        raise HTTPException(
            status_code=404,
            detail="El operario no existe."
        )

    nuevo_movimiento = models.Movimiento(
        orden_id=movimiento.orden_id,
        proceso=movimiento.proceso,
        operario_id=movimiento.operario_id,
        maquina=movimiento.maquina,
        entrada=movimiento.entrada,
        salida=movimiento.salida,
        unidad=movimiento.unidad,
        merma=movimiento.merma,
        observacion=movimiento.observacion
    )

    db.add(nuevo_movimiento)
    db.commit()
    db.refresh(nuevo_movimiento)

    return nuevo_movimiento


def obtener_movimientos(db: Session):
    return db.query(models.Movimiento).all()


def obtener_movimientos_por_orden(
    db: Session,
    orden_id: int
):
    return (
        db.query(models.Movimiento)
        .filter(models.Movimiento.orden_id == orden_id)
        .all()
    )

def crear_producto(
    db: Session,
    producto: schemas.ProductoCreate
):
    nuevo_producto = models.Producto(
        nombre=producto.nombre,
        descripcion=producto.descripcion
    )

    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)

    return nuevo_producto


def obtener_productos(db: Session):
    return db.query(models.Producto).all()


def crear_operario(
    db: Session,
    operario: schemas.OperarioCreate
):
    nuevo_operario = models.Operario(
        nombre=operario.nombre,
        cargo=operario.cargo
    )

    db.add(nuevo_operario)
    db.commit()
    db.refresh(nuevo_operario)

    return nuevo_operario


def obtener_operarios(db: Session):
    return db.query(models.Operario).all()


def eliminar_orden_produccion(db: Session, orden_id: int):
    orden = db.get(models.OrdenProduccion, orden_id)
    if orden is None:
        raise HTTPException(
            status_code=404,
            detail="La Orden de Producción no existe."
        )

    db.query(models.Movimiento).filter(models.Movimiento.orden_id == orden_id).delete()
    db.delete(orden)
    db.commit()
    
def obtener_cliente_por_ruc(
    db: Session,
    ruc: str
):
    return (
        db.query(models.Cliente)
        .filter(models.Cliente.ruc == ruc)
        .first()
    )

def eliminar_cliente(db: Session, cliente_id: int):
    cliente = db.get(models.Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="El cliente no existe.")

    db.delete(cliente)
    db.commit()

def eliminar_operario(db: Session, operario_id: int):
    operario = db.get(models.Operario, operario_id)
    if operario is None:
        raise HTTPException(status_code=404, detail="El operario no existe.")

    db.delete(operario)
    db.commit()

def eliminar_movimiento(db: Session, movimiento_id: int):
    movimiento = db.get(models.Movimiento, movimiento_id)
    if movimiento is None:
        raise HTTPException(status_code=404, detail="El movimiento no existe.")

    db.delete(movimiento)
    db.commit()

def editar_cliente(db: Session, cliente_id: int, cliente_nuevo: schemas.ClienteCreate):
    cliente = db.get(models.Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="El cliente no existe.")

    cliente.ruc = cliente_nuevo.ruc
    cliente.nombre = cliente_nuevo.nombre

    db.commit()
    db.refresh(cliente)
    return cliente

def editar_operario(db: Session, operario_id: int, operario_nuevo: schemas.OperarioCreate):
    operario = db.get(models.Operario, operario_id)
    if operario is None:
        raise HTTPException(status_code=404, detail="El operario no existe.")

    operario.nombre = operario_nuevo.nombre
    operario.cargo = operario_nuevo.cargo

    db.commit()
    db.refresh(operario)
    return operario
