# =========================
# IMPORTACIONES
# =========================

from sqlalchemy.orm import Session
from fastapi import HTTPException

import models
import schemas

from datetime import datetime
from zoneinfo import ZoneInfo

ZONA_LIMA = ZoneInfo("America/Lima")


def ahora_lima():
    return datetime.now(ZONA_LIMA)


# =========================
# CLIENTES
# =========================

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
        raise HTTPException(
            status_code=404,
            detail="El cliente no existe."
        )

    db.delete(cliente)
    db.commit()


def editar_cliente(
    db: Session,
    cliente_id: int,
    cliente_nuevo: schemas.ClienteCreate
):
    cliente = db.get(models.Cliente, cliente_id)

    if cliente is None:
        raise HTTPException(
            status_code=404,
            detail="El cliente no existe."
        )

    cliente.ruc = cliente_nuevo.ruc
    cliente.nombre = cliente_nuevo.nombre

    db.commit()
    db.refresh(cliente)

    return cliente


# =========================
# ÓRDENES DE PRODUCCIÓN
# =========================

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

    ahora = ahora_lima()

    nueva_orden = models.OrdenProduccion(
        codigo=orden.codigo,
        cliente_id=cliente.id,
        numero_std=orden.numero_std,
        descripcion=orden.descripcion,
        cantidad=orden.cantidad,
        unidad=orden.unidad,
        estado=orden.estado,
        fecha=ahora.date(),
        hora=ahora.time()
    )

    db.add(nueva_orden)
    db.commit()
    db.refresh(nueva_orden)

    nueva_orden.ruc = cliente.ruc
    nueva_orden.cliente = cliente.nombre

    return nueva_orden

def buscar_clientes(db: Session, q: str):
    return (
        db.query(models.Cliente)
        .filter(models.Cliente.ruc.ilike(f"%{q}%"))
        .order_by(models.Cliente.ruc)
        .limit(10)
        .all()
    )

def calcular_estado(proceso: str | None) -> str:
    if proceso is None:
        return "Pendiente"

    if proceso == "Despacho":
        return "Terminado"

    if proceso == "Almacén":
        return "En almacén"

    return "En proceso"

def actualizar_procesos_plan(db: Session, orden_id: int, procesos: str):
    orden = db.get(models.OrdenProduccion, orden_id)
    if orden is None:
        raise HTTPException(status_code=404, detail="La Orden de Producción no existe.")

    orden.procesos_plan = procesos
    db.commit()
    db.refresh(orden)

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

    return orden

def obtener_ordenes_produccion(db: Session):
    ordenes = (
        db.query(models.OrdenProduccion)
        .order_by(models.OrdenProduccion.id.desc())
        .all()
    )

    for orden in ordenes:
        orden.ruc = orden.cliente_obj.ruc
        orden.cliente = orden.cliente_obj.nombre

        ultimo_movimiento = (
            db.query(models.Movimiento)
            .filter(models.Movimiento.orden_id == orden.id)
            .order_by(models.Movimiento.id.desc())
            .first()
        )

        proceso_actual = (
            ultimo_movimiento.proceso
            if ultimo_movimiento
            else None
        )

        orden.ultimo_proceso = proceso_actual or "Sin iniciar"
        orden.estado = calcular_estado(proceso_actual)

    return ordenes


def eliminar_orden_produccion(
    db: Session,
    orden_id: int
):
    orden = db.get(models.OrdenProduccion, orden_id)

    if orden is None:
        raise HTTPException(
            status_code=404,
            detail="La Orden de Producción no existe."
        )

    db.query(models.Movimiento).filter(
        models.Movimiento.orden_id == orden_id
    ).delete()

    db.delete(orden)
    db.commit()


# =========================
# MOVIMIENTOS
# =========================

def crear_movimiento(db: Session, movimiento: schemas.MovimientoCreate):
    orden = db.get(models.OrdenProduccion, movimiento.orden_id)
    if orden is None:
        raise HTTPException(status_code=404, detail="La Orden de Producción no existe.")

    operario = (
        db.query(models.Operario)
        .filter(models.Operario.nombre.ilike(movimiento.nombre_operario.strip()))
        .first()
    )

    if operario is None:
        operario = models.Operario(nombre=movimiento.nombre_operario.strip())
        db.add(operario)
        db.commit()
        db.refresh(operario)

    ahora = ahora_lima()

    nuevo_movimiento = models.Movimiento(
        orden_id=movimiento.orden_id,
        proceso=movimiento.proceso,
        operario_id=operario.id,
        maquina=movimiento.maquina,
        entrada=movimiento.entrada,
        salida=movimiento.salida,
        unidad=movimiento.unidad,
        merma=movimiento.merma,
        observacion=movimiento.observacion,
        fecha=ahora.date(),
        hora=ahora.time()
    )

    db.add(nuevo_movimiento)
    db.commit()
    db.refresh(nuevo_movimiento)

    return nuevo_movimiento


def obtener_movimientos(db: Session):
    return db.query(models.Movimiento).all()


def buscar_operarios(db: Session, q: str):
    return (
        db.query(models.Operario)
        .filter(models.Operario.nombre.ilike(f"%{q}%"))
        .order_by(models.Operario.nombre)
        .limit(10)
        .all()
    )

def obtener_movimientos_por_orden(
    db: Session,
    orden_id: int
):
    return (
        db.query(models.Movimiento)
        .filter(models.Movimiento.orden_id == orden_id)
        .all()
    )

def buscar_ordenes(db: Session, q: str):
    resultados = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.codigo.ilike(f"%{q}%"))
        .order_by(models.OrdenProduccion.id.desc())
        .limit(10)
        .all()
    )

    for orden in resultados:
        orden.ruc = orden.cliente_obj.ruc
        orden.cliente = orden.cliente_obj.nombre

        ultimo_movimiento = (
            db.query(models.Movimiento)
            .filter(models.Movimiento.orden_id == orden.id)
            .order_by(models.Movimiento.id.desc())
            .first()
        )

        proceso_actual = (
            ultimo_movimiento.proceso
            if ultimo_movimiento
            else None
        )

        orden.ultimo_proceso = proceso_actual or "Sin iniciar"
        orden.estado = calcular_estado(proceso_actual)

    return resultados


def eliminar_movimiento(
    db: Session,
    movimiento_id: int
):
    movimiento = db.get(
        models.Movimiento,
        movimiento_id
    )

    if movimiento is None:
        raise HTTPException(
            status_code=404,
            detail="El movimiento no existe."
        )

    db.delete(movimiento)
    db.commit()


# =========================
# PRODUCTOS
# =========================

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


# =========================
# OPERARIOS
# =========================

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


def eliminar_operario(
    db: Session,
    operario_id: int
):
    operario = db.get(
        models.Operario,
        operario_id
    )

    if operario is None:
        raise HTTPException(
            status_code=404,
            detail="El operario no existe."
        )

    db.delete(operario)
    db.commit()


def editar_operario(
    db: Session,
    operario_id: int,
    operario_nuevo: schemas.OperarioCreate
):
    operario = db.get(
        models.Operario,
        operario_id
    )

    if operario is None:
        raise HTTPException(
            status_code=404,
            detail="El operario no existe."
        )

    operario.nombre = operario_nuevo.nombre
    operario.cargo = operario_nuevo.cargo

    db.commit()
    db.refresh(operario)

    return operario


# =========================
# DETALLES DE MOVIMIENTO
# =========================

def crear_detalle_movimiento(
    db: Session,
    movimiento_id: int,
    detalle: schemas.DetalleMovimientoCreate
):
    movimiento = db.get(
        models.Movimiento,
        movimiento_id
    )

    if movimiento is None:
        raise HTTPException(
            status_code=404,
            detail="El movimiento no existe."
        )

    nuevo = models.DetalleMovimiento(
        movimiento_id=movimiento_id,
        tipo=detalle.tipo,
        numero=detalle.numero,
        peso=detalle.peso,
        millares=detalle.millares
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return nuevo


def obtener_detalles_movimiento(
    db: Session,
    movimiento_id: int
):
    return (
        db.query(models.DetalleMovimiento)
        .filter(
            models.DetalleMovimiento.movimiento_id == movimiento_id
        )
        .order_by(models.DetalleMovimiento.numero)
        .all()
    )


def eliminar_detalle_movimiento(
    db: Session,
    detalle_id: int
):
    detalle = db.get(
        models.DetalleMovimiento,
        detalle_id
    )

    if detalle is None:
        raise HTTPException(
            status_code=404,
            detail="El detalle no existe."
        )

    db.delete(detalle)
    db.commit()