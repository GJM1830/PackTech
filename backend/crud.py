# =========================
# IMPORTACIONES
# =========================

from sqlalchemy.orm import Session
from fastapi import HTTPException

import models
import schemas

import statistics
from datetime import datetime, timedelta
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
    ruc_limpio = cliente.ruc.strip() if cliente.ruc and cliente.ruc.strip() else None

    if ruc_limpio:
        cliente_existente = (
            db.query(models.Cliente)
            .filter(models.Cliente.ruc == ruc_limpio)
            .first()
        )

        if cliente_existente is not None:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un cliente con ese RUC."
            )

    nuevo_cliente = models.Cliente(
        ruc=ruc_limpio,
        nombre=cliente.nombre
    )

    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)

    return nuevo_cliente


def obtener_clientes(db: Session, limit: int = 20, antes_de: int | None = None):
    query = db.query(models.Cliente)

    if antes_de:
        query = query.filter(models.Cliente.id < antes_de)

    return query.order_by(models.Cliente.id.desc()).limit(limit).all()

def obtener_cliente_por_ruc(
    db: Session,
    ruc: str | None
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

    tiene_ordenes = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.cliente_id == cliente_id)
        .first()
    )

    if tiene_ordenes is not None:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: este cliente tiene Órdenes de Producción registradas. Elimina o reasigna esas órdenes primero."
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
    if not orden.codigo or not orden.codigo.strip():
        raise HTTPException(status_code=400, detail="El código de la orden no puede estar vacío.")

    if orden.cantidad is not None and orden.cantidad < 0:
        raise HTTPException(status_code=400, detail="La cantidad no puede ser negativa.")

    if orden.numero_std is not None and orden.numero_std < 0:
        raise HTTPException(status_code=400, detail="El número estándar no puede ser negativo.")

    cliente = None
    ruc_limpio = orden.ruc.strip() if orden.ruc and orden.ruc.strip() else None
    nombre_cliente_limpio = orden.nombre_cliente.strip() if orden.nombre_cliente else None

    if ruc_limpio:
        cliente = (
            db.query(models.Cliente)
            .filter(models.Cliente.ruc == ruc_limpio)
            .first()
        )
    elif nombre_cliente_limpio:
        cliente = (
            db.query(models.Cliente)
            .filter(models.Cliente.ruc.is_(None))
            .filter(models.Cliente.nombre.ilike(nombre_cliente_limpio))
            .first()
        )

    if cliente is None:
        if not orden.nombre_cliente:
            raise HTTPException(
                status_code=400,
                detail="Cliente no encontrado. Debe ingresar el nombre."
            )

        cliente = models.Cliente(
            ruc=ruc_limpio,
            nombre=nombre_cliente_limpio
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

    if orden.unidad_precio == "millares" and not orden.millares:
        raise HTTPException(status_code=400, detail="Debes indicar los millares si el precio es por millar.")

    costo_total_calc = None
    if orden.precio_unitario is not None and orden.unidad_precio:
        if orden.unidad_precio == "millares":
            costo_total_calc = float(orden.precio_unitario) * float(orden.millares)
        else:
            costo_total_calc = float(orden.precio_unitario) * float(orden.cantidad)

    if orden.vendedor and orden.vendedor.strip():
        crear_vendedor_si_no_existe(db, orden.vendedor.strip())

    ahora = ahora_lima()



    nueva_orden = models.OrdenProduccion(
        codigo=orden.codigo,
        cliente_id=cliente.id,
        numero_std=orden.numero_std,
        descripcion=orden.descripcion,
        medidas=orden.medidas,
        cantidad=orden.cantidad,
        unidad=orden.unidad,
        estado=orden.estado,
        fecha=ahora.date(),
        hora=ahora.time(),
        procesos_plan=orden.procesos_plan,
        tipo_trabajo=orden.tipo_trabajo,
        moneda=orden.moneda,
        vendedor=orden.vendedor.strip() if orden.vendedor and orden.vendedor.strip() else None,
        fecha_entrega=orden.fecha_entrega,
        precio_unitario=orden.precio_unitario,
        unidad_precio=orden.unidad_precio,
        millares=orden.millares,
        costo_total=costo_total_calc,
        direccion_entrega=orden.direccion_entrega,
        numero_contacto=orden.numero_contacto,
        email_cliente=orden.email_cliente,
        telefono_cliente=orden.telefono_cliente
    )

    db.add(nueva_orden)
    db.commit()
    db.refresh(nueva_orden)

    nueva_orden.ruc = cliente.ruc
    nueva_orden.cliente = cliente.nombre
    nueva_orden.ultimo_proceso = "Sin iniciar"

    return nueva_orden


def buscar_clientes(db: Session, q: str):
    return (
        db.query(models.Cliente)
        .filter(
            (models.Cliente.ruc.ilike(f"%{q}%")) |
            (models.Cliente.nombre.ilike(f"%{q}%"))
        )
        .order_by(models.Cliente.nombre)
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


def obtener_ordenes_produccion(db: Session, limit: int = 20, antes_de: int | None = None):
    query = db.query(models.OrdenProduccion).filter(models.OrdenProduccion.estado != "Preaprobada")

    if antes_de:
        query = query.filter(models.OrdenProduccion.id < antes_de)

    ordenes = (
        query
        .order_by(models.OrdenProduccion.id.desc())
        .limit(limit)
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
    orden_id: int,
    rol_usuario: str
):
    orden = db.get(models.OrdenProduccion, orden_id)

    if orden is None:
        raise HTTPException(
            status_code=404,
            detail="La Orden de Producción no existe."
        )

    if orden.estado != "Preaprobada" and rol_usuario != "admin":
        raise HTTPException(
            status_code=403,
            detail="Solo un administrador puede eliminar una orden que ya está en producción."
        )

    movimientos_ids = [
        m.id for m in
        db.query(models.Movimiento.id).filter(models.Movimiento.orden_id == orden_id).all()
    ]

    if movimientos_ids:
        detalle_merma_ids = [
            d.id for d in
            db.query(models.DetalleMerma.id)
            .filter(models.DetalleMerma.movimiento_id.in_(movimientos_ids))
            .all()
        ]
        if detalle_merma_ids:
            db.query(models.MovimientoAglomerado).filter(
                models.MovimientoAglomerado.detalle_merma_id.in_(detalle_merma_ids)
            ).delete(synchronize_session=False)

        db.query(models.DetalleMovimiento).filter(
            models.DetalleMovimiento.movimiento_id.in_(movimientos_ids)
        ).delete(synchronize_session=False)

        db.query(models.DetalleMerma).filter(
            models.DetalleMerma.movimiento_id.in_(movimientos_ids)
        ).delete(synchronize_session=False)

    db.query(models.MovimientoAglomerado).filter(
        models.MovimientoAglomerado.orden_id == orden_id
    ).update({"orden_id": None}, synchronize_session=False)

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

    if movimiento.entrada is not None and movimiento.entrada < 0:
        raise HTTPException(status_code=400, detail="La entrada no puede ser negativa.")

    if movimiento.salida is not None and movimiento.salida < 0:
        raise HTTPException(status_code=400, detail="La salida no puede ser negativa.")

    nombre_operario_limpio = movimiento.nombre_operario.strip()
    if not nombre_operario_limpio:
        raise HTTPException(status_code=400, detail="El nombre del operario no puede estar vacío.")

    operario = (
        db.query(models.Operario)
        .filter(models.Operario.nombre.ilike(nombre_operario_limpio))
        .first()
    )
    if operario is None:
        operario = models.Operario(nombre=nombre_operario_limpio)
        db.add(operario)
        db.commit()
        db.refresh(operario)

    tipo_laminado_limpio = movimiento.tipo_laminado.strip() if movimiento.tipo_laminado and movimiento.tipo_laminado.strip() else None
    tipo_merma_limpio = movimiento.tipo_merma.strip() if movimiento.tipo_merma and movimiento.tipo_merma.strip() else None

    if tipo_laminado_limpio:
        crear_tipo_merma_si_no_existe(db, "Laminado", tipo_laminado_limpio)

    if tipo_merma_limpio:
        crear_tipo_merma_si_no_existe(db, movimiento.proceso, tipo_merma_limpio)

    ahora = ahora_lima()

    nuevo_movimiento = models.Movimiento(
        orden_id=movimiento.orden_id,
        proceso=movimiento.proceso,
        operario_id=operario.id,
        maquina=movimiento.maquina,
        entrada=movimiento.entrada,
        salida=movimiento.salida,
        unidad=movimiento.unidad,
        merma=movimiento.entrada - movimiento.salida,
        merma_real=movimiento.merma_real,
        tipo_merma=tipo_merma_limpio,
        tipo_laminado=tipo_laminado_limpio,
        observacion=movimiento.observacion,
        fecha=ahora.date(),
        hora=ahora.time(),
        hora_inicio=movimiento.hora_inicio,
        hora_fin=movimiento.hora_fin,
    )

    db.add(nuevo_movimiento)
    db.commit()
    db.refresh(nuevo_movimiento)

    return nuevo_movimiento


def actualizar_totales_movimiento(db: Session, movimiento_id: int):
    movimiento = db.get(models.Movimiento, movimiento_id)
    if movimiento is None:
        return

    detalles = (
        db.query(models.DetalleMovimiento)
        .filter(models.DetalleMovimiento.movimiento_id == movimiento_id)
        .all()
    )

    entrada_total = sum(d.peso_neto for d in detalles if d.lado == "entrada")
    salida_total = sum(d.peso_neto for d in detalles if d.lado == "salida")

    if entrada_total > 0:
        movimiento.entrada = entrada_total
    if salida_total > 0:
        movimiento.salida = salida_total

    movimiento.merma = movimiento.entrada - movimiento.salida

    db.commit()


def obtener_movimientos(db: Session, limit: int = 20, antes_de: int | None = None):
    query = db.query(models.Movimiento)

    if antes_de:
        query = query.filter(models.Movimiento.id < antes_de)

    return (
        query
        .order_by(models.Movimiento.id.desc())
        .limit(limit)
        .all()
    )


def buscar_movimientos(db: Session, q: str):
    return (
        db.query(models.Movimiento)
        .join(models.OrdenProduccion, models.Movimiento.orden_id == models.OrdenProduccion.id)
        .join(models.Cliente, models.OrdenProduccion.cliente_id == models.Cliente.id)
        .filter(
            (models.OrdenProduccion.codigo.ilike(f"%{q}%")) |
            (models.Cliente.nombre.ilike(f"%{q}%"))
        )
        .order_by(models.Movimiento.id.desc())
        .limit(50)
        .all()
    )


def buscar_operarios(db: Session, q: str):
    return (
        db.query(models.Operario)
        .filter(models.Operario.nombre.ilike(f"%{q}%"))
        .order_by(models.Operario.nombre)
        .limit(10)
        .all()
    )


def obtener_movimientos_por_orden(db: Session, orden_id: int):
    return (
        db.query(models.Movimiento)
        .filter(models.Movimiento.orden_id == orden_id)
        .order_by(models.Movimiento.id.desc())
        .all()
    )


def filtrar_movimientos(
    db: Session,
    q: str | None = None,
    proceso: str | None = None,
    maquina: str | None = None,
    operario: str | None = None,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    limit: int = 20,
    antes_de: int | None = None
):
    """
    Filtrado combinado real de movimientos (código/cliente + proceso + máquina +
    operario + rango de fecha), aplicado en la base de datos.
    """
    query = db.query(models.Movimiento)

    if q:
        query = (
            query
            .join(models.OrdenProduccion, models.Movimiento.orden_id == models.OrdenProduccion.id)
            .join(models.Cliente, models.OrdenProduccion.cliente_id == models.Cliente.id)
            .filter(
                (models.OrdenProduccion.codigo.ilike(f"%{q}%")) |
                (models.Cliente.nombre.ilike(f"%{q}%"))
            )
        )

    if proceso:
        query = query.filter(models.Movimiento.proceso == proceso)

    if maquina:
        query = query.filter(models.Movimiento.maquina == maquina)

    if operario:
        query = (
            query
            .join(models.Operario, models.Movimiento.operario_id == models.Operario.id)
            .filter(models.Operario.nombre == operario)
        )

    if fecha_desde:
        query = query.filter(models.Movimiento.fecha >= fecha_desde)

    if fecha_hasta:
        query = query.filter(models.Movimiento.fecha <= fecha_hasta)

    if antes_de:
        query = query.filter(models.Movimiento.id < antes_de)

    return query.order_by(models.Movimiento.id.desc()).limit(limit).all()


def buscar_ordenes(db: Session, q: str):
    resultados = (
        db.query(models.OrdenProduccion)
        .join(models.Cliente, models.OrdenProduccion.cliente_id == models.Cliente.id)
        .filter(
            (models.OrdenProduccion.codigo.ilike(f"%{q}%")) |
            (models.Cliente.nombre.ilike(f"%{q}%"))
        )
        .filter(models.OrdenProduccion.estado != "Preaprobada")
        .order_by(models.OrdenProduccion.id.desc())
        .limit(50)
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


def filtrar_ordenes_produccion(
    db: Session,
    q: str | None = None,
    producto: str | None = None,
    estado: str | None = None,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    limit: int = 20,
    antes_de: int | None = None
):
    """
    Filtrado combinado real (código/cliente + producto + estado + rango de fecha),
    todo aplicado en la base de datos — no sobre el lote ya cargado en pantalla.
    """
    query = (
        db.query(models.OrdenProduccion)
        .join(models.Cliente, models.OrdenProduccion.cliente_id == models.Cliente.id)
        .filter(models.OrdenProduccion.estado != "Preaprobada")
    )

    if q:
        query = query.filter(
            (models.OrdenProduccion.codigo.ilike(f"%{q}%")) |
            (models.Cliente.nombre.ilike(f"%{q}%"))
        )

    if producto:
        query = query.filter(models.OrdenProduccion.descripcion.ilike(f"%{producto}%"))

    if estado:
        query = query.filter(models.OrdenProduccion.estado == estado)

    if fecha_desde:
        query = query.filter(models.OrdenProduccion.fecha >= fecha_desde)

    if fecha_hasta:
        query = query.filter(models.OrdenProduccion.fecha <= fecha_hasta)

    if antes_de:
        query = query.filter(models.OrdenProduccion.id < antes_de)

    ordenes = query.order_by(models.OrdenProduccion.id.desc()).limit(limit).all()

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

        # El filtro por estado se resuelve contra el estado calculado (dinámico),
        # no contra el campo estado guardado, salvo Terminado/Preaprobada que sí son reales.
        orden.ultimo_proceso = proceso_actual or "Sin iniciar"
        orden.estado = calcular_estado(proceso_actual)

    if estado:
        ordenes = [o for o in ordenes if o.estado == estado]

    return ordenes


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

    detalle_merma_ids = [
        d.id for d in
        db.query(models.DetalleMerma.id)
        .filter(models.DetalleMerma.movimiento_id == movimiento_id)
        .all()
    ]
    if detalle_merma_ids:
        db.query(models.MovimientoAglomerado).filter(
            models.MovimientoAglomerado.detalle_merma_id.in_(detalle_merma_ids)
        ).delete(synchronize_session=False)

    db.query(models.DetalleMovimiento).filter(
        models.DetalleMovimiento.movimiento_id == movimiento_id
    ).delete()

    db.query(models.DetalleMerma).filter(
        models.DetalleMerma.movimiento_id == movimiento_id
    ).delete()

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


def obtener_operarios(db: Session, limit: int = 20, antes_de: int | None = None):
    query = db.query(models.Operario)

    if antes_de:
        query = query.filter(models.Operario.id < antes_de)

    return query.order_by(models.Operario.id.desc()).limit(limit).all()


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

    db.query(models.Movimiento).filter(
        models.Movimiento.operario_id == operario_id
    ).update({"operario_id": None}, synchronize_session=False)

    db.query(models.MovimientoAglomerado).filter(
        models.MovimientoAglomerado.operario_id == operario_id
    ).update({"operario_id": None}, synchronize_session=False)

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
# DETALLES DE MERMA
# =========================

def crear_detalle_merma(db: Session, movimiento_id: int, detalle: schemas.DetalleMermaCreate):
    movimiento = db.get(models.Movimiento, movimiento_id)
    if movimiento is None:
        raise HTTPException(status_code=404, detail="El movimiento no existe.")

    if detalle.peso is not None and detalle.peso <= 0:
        raise HTTPException(status_code=400, detail="El peso de la merma debe ser mayor a cero.")

    if movimiento.operario_id is None or not movimiento.maquina:
        raise HTTPException(
            status_code=400,
            detail="Debes asignar operario y máquina a este movimiento antes de registrar merma."
        )

    if detalle.tipo_merma and detalle.tipo_merma.strip():
        crear_tipo_merma_si_no_existe(db, movimiento.proceso, detalle.tipo_merma.strip())

    nuevo = models.DetalleMerma(
        movimiento_id=movimiento_id,
        peso=detalle.peso,
        tipo_merma=detalle.tipo_merma
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    actualizar_merma_real(db, movimiento_id)

    try:
        orden = movimiento.orden_id and db.get(models.OrdenProduccion, movimiento.orden_id)
        producto_origen = orden.descripcion if orden else None

        if producto_origen and producto_origen.strip():
            crear_producto_aglomerado_si_no_existe(db, producto_origen.strip())

        if detalle.tipo_merma and detalle.tipo_merma.strip():
            crear_clasificacion_aglomerado_si_no_existe(db, detalle.tipo_merma.strip())

        ahora = ahora_lima()

        entrada_aglomerado = models.MovimientoAglomerado(
            tipo="entrada",
            cantidad=detalle.peso,
            proceso_origen=movimiento.proceso,
            producto_origen=producto_origen,
            orden_id=movimiento.orden_id,
            clasificacion=detalle.tipo_merma,
            operario_id=movimiento.operario_id,
            observacion=movimiento.observacion,
            detalle_merma_id=nuevo.id,
            origen_automatico=True,
            fecha=ahora.date(),
            hora=ahora.time()
        )
        db.add(entrada_aglomerado)
        db.commit()
    except Exception:
        db.rollback()

    return nuevo


def obtener_detalles_merma(db: Session, movimiento_id: int):
    return (
        db.query(models.DetalleMerma)
        .filter(models.DetalleMerma.movimiento_id == movimiento_id)
        .all()
    )


def editar_detalle_merma(db: Session, detalle_id: int, detalle: schemas.DetalleMermaCreate):
    existente = db.get(models.DetalleMerma, detalle_id)
    if existente is None:
        raise HTTPException(status_code=404, detail="El detalle de merma no existe.")

    if detalle.tipo_merma and detalle.tipo_merma.strip():
        movimiento = db.get(models.Movimiento, existente.movimiento_id)
        crear_tipo_merma_si_no_existe(db, movimiento.proceso, detalle.tipo_merma.strip())

    existente.peso = detalle.peso
    existente.tipo_merma = detalle.tipo_merma

    db.commit()
    db.refresh(existente)

    actualizar_merma_real(db, existente.movimiento_id)

    aglomerado = (
        db.query(models.MovimientoAglomerado)
        .filter(models.MovimientoAglomerado.detalle_merma_id == detalle_id)
        .first()
    )
    if aglomerado:
        aglomerado.cantidad = detalle.peso
        aglomerado.clasificacion = detalle.tipo_merma
        db.commit()

    return existente


def eliminar_detalle_merma(db: Session, detalle_id: int):
    detalle = db.get(models.DetalleMerma, detalle_id)
    if detalle is None:
        raise HTTPException(status_code=404, detail="El detalle de merma no existe.")

    movimiento_id = detalle.movimiento_id

    db.query(models.MovimientoAglomerado).filter(
        models.MovimientoAglomerado.detalle_merma_id == detalle_id
    ).delete()

    db.delete(detalle)
    db.commit()

    actualizar_merma_real(db, movimiento_id)


def actualizar_merma_real(db: Session, movimiento_id: int):
    movimiento = db.get(models.Movimiento, movimiento_id)
    if movimiento is None:
        return

    detalles = (
        db.query(models.DetalleMerma)
        .filter(models.DetalleMerma.movimiento_id == movimiento_id)
        .all()
    )

    if detalles:
        movimiento.merma_real = sum(d.peso for d in detalles)
        db.commit()


# =========================
# DETALLES DE MOVIMIENTO
# =========================

def crear_detalle_movimiento(db: Session, movimiento_id: int, detalle: schemas.DetalleMovimientoCreate):
    movimiento = db.get(models.Movimiento, movimiento_id)

    if movimiento is None:
        raise HTTPException(status_code=404, detail="El movimiento no existe.")

    if detalle.peso_bruto is not None and detalle.peso_bruto < 0:
        raise HTTPException(status_code=400, detail="El peso bruto no puede ser negativo.")

    if detalle.peso_tuco is not None and detalle.peso_tuco < 0:
        raise HTTPException(status_code=400, detail="El peso del tuco no puede ser negativo.")

    if detalle.tipo_material and detalle.tipo_material.strip():
        crear_tipo_material_si_no_existe(db, detalle.tipo_material.strip())

    peso_tuco = detalle.peso_tuco or 0
    peso_neto = detalle.peso_bruto - peso_tuco

    if peso_neto < 0:
        raise HTTPException(status_code=400, detail="El peso neto no puede ser negativo (revisa el peso del tuco).")

    nuevo = models.DetalleMovimiento(
        movimiento_id=movimiento_id,
        tipo=detalle.tipo,
        lado=detalle.lado,
        numero=detalle.numero,
        peso_bruto=detalle.peso_bruto,
        peso_tuco=peso_tuco,
        peso_neto=peso_neto,
        millares=detalle.millares if detalle.tipo == "fardo" else None,
        tipo_material=detalle.tipo_material
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    actualizar_totales_movimiento(db, movimiento_id)

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


def eliminar_detalle_movimiento(db: Session, detalle_id: int):
    detalle = db.get(models.DetalleMovimiento, detalle_id)
    if detalle is None:
        raise HTTPException(status_code=404, detail="El detalle no existe.")

    movimiento_id = detalle.movimiento_id
    db.delete(detalle)
    db.commit()

    actualizar_totales_movimiento(db, movimiento_id)

    movimiento = db.get(models.Movimiento, movimiento_id)
    if movimiento and movimiento.proceso == "Extrusión":
        quedan_materiales = (
            db.query(models.DetalleMovimiento)
            .filter(models.DetalleMovimiento.movimiento_id == movimiento_id)
            .filter(models.DetalleMovimiento.tipo == "material")
            .count()
        )
        if quedan_materiales == 0:
            movimiento.entrada = 0
            movimiento.merma = movimiento.entrada - movimiento.salida
            db.commit()


# =========================
# TIPOS DE MERMA
# =========================

def buscar_tipos_merma(db: Session, proceso: str, q: str):
    return (
        db.query(models.TipoMerma)
        .filter(models.TipoMerma.proceso == proceso)
        .filter(models.TipoMerma.nombre.ilike(f"%{q}%"))
        .order_by(models.TipoMerma.nombre)
        .limit(10)
        .all()
    )


def crear_tipo_merma_si_no_existe(db: Session, proceso: str, nombre: str):
    nombre = nombre.strip()
    if not nombre:
        return

    existente = (
        db.query(models.TipoMerma)
        .filter(models.TipoMerma.proceso == proceso)
        .filter(models.TipoMerma.nombre.ilike(nombre))
        .first()
    )
    if existente is None:
        nuevo = models.TipoMerma(proceso=proceso, nombre=nombre)
        db.add(nuevo)
        db.commit()


# =========================
# TIPOS DE MATERIAL
# =========================

def buscar_tipos_material(db: Session, q: str):
    return (
        db.query(models.TipoMaterial)
        .filter(models.TipoMaterial.nombre.ilike(f"%{q}%"))
        .order_by(models.TipoMaterial.nombre)
        .limit(10)
        .all()
    )

def buscar_vendedores(db: Session, q: str):
    return (
        db.query(models.Vendedor)
        .filter(models.Vendedor.nombre.ilike(f"%{q}%"))
        .order_by(models.Vendedor.nombre)
        .limit(10)
        .all()
    )


def crear_vendedor_si_no_existe(db: Session, nombre: str):
    nombre = nombre.strip()
    if not nombre:
        return

    existente = (
        db.query(models.Vendedor)
        .filter(models.Vendedor.nombre.ilike(nombre))
        .first()
    )
    if existente is None:
        nuevo = models.Vendedor(nombre=nombre)
        db.add(nuevo)
        db.commit()

def crear_tipo_material_si_no_existe(db: Session, nombre: str):
    nombre = nombre.strip()
    if not nombre:
        return

    existente = (
        db.query(models.TipoMaterial)
        .filter(models.TipoMaterial.nombre.ilike(nombre))
        .first()
    )
    if existente is None:
        nuevo = models.TipoMaterial(nombre=nombre)
        db.add(nuevo)
        db.commit()
        
        
    # =========================
# AGLOMERADO
# =========================

def crear_producto_aglomerado_si_no_existe(db: Session, nombre: str):
    nombre = nombre.strip()
    if not nombre:
        return

    existente = (
        db.query(models.ProductoAglomerado)
        .filter(models.ProductoAglomerado.nombre.ilike(nombre))
        .first()
    )
    if existente is None:
        nuevo = models.ProductoAglomerado(nombre=nombre)
        db.add(nuevo)
        db.commit()


def buscar_productos_aglomerado(db: Session, q: str):
    return (
        db.query(models.ProductoAglomerado)
        .filter(models.ProductoAglomerado.nombre.ilike(f"%{q}%"))
        .order_by(models.ProductoAglomerado.nombre)
        .limit(10)
        .all()
    )


def crear_clasificacion_aglomerado_si_no_existe(db: Session, nombre: str):
    nombre = nombre.strip()
    if not nombre:
        return

    existente = (
        db.query(models.ClasificacionAglomerado)
        .filter(models.ClasificacionAglomerado.nombre.ilike(nombre))
        .first()
    )
    if existente is None:
        nuevo = models.ClasificacionAglomerado(nombre=nombre)
        db.add(nuevo)
        db.commit()


def buscar_clasificaciones_aglomerado(db: Session, q: str):
    return (
        db.query(models.ClasificacionAglomerado)
        .filter(models.ClasificacionAglomerado.nombre.ilike(f"%{q}%"))
        .order_by(models.ClasificacionAglomerado.nombre)
        .limit(10)
        .all()
    )


def crear_movimiento_aglomerado(db: Session, movimiento: schemas.MovimientoAglomeradoCreate, rol_usuario: str):
    if movimiento.cantidad is None or movimiento.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero.")

    if movimiento.tipo not in ("entrada", "salida", "ajuste"):
        raise HTTPException(status_code=400, detail="Tipo de movimiento no válido.")

    if movimiento.tipo == "ajuste" and rol_usuario != "admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede registrar un ajuste de saldo.")
        raise HTTPException(status_code=400, detail="Tipo de movimiento no válido.")

    nombre_operario_limpio = movimiento.nombre_operario.strip()
    if not nombre_operario_limpio:
        raise HTTPException(status_code=400, detail="El nombre del operario no puede estar vacío.")

    operario = (
        db.query(models.Operario)
        .filter(models.Operario.nombre.ilike(nombre_operario_limpio))
        .first()
    )
    if operario is None:
        operario = models.Operario(nombre=nombre_operario_limpio)
        db.add(operario)
        db.commit()
        db.refresh(operario)

    orden_id = None
    if movimiento.codigo_orden and movimiento.codigo_orden.strip():
        orden = (
            db.query(models.OrdenProduccion)
            .filter(models.OrdenProduccion.codigo.ilike(movimiento.codigo_orden.strip()))
            .first()
        )
        if orden is None:
            raise HTTPException(
                status_code=400,
                detail="No se encontró ninguna Orden con ese código."
            )
        orden_id = orden.id

    producto_origen_limpio = movimiento.producto_origen.strip() if movimiento.producto_origen and movimiento.producto_origen.strip() else None
    clasificacion_limpia = movimiento.clasificacion.strip() if movimiento.clasificacion and movimiento.clasificacion.strip() else None

    if producto_origen_limpio:
        crear_producto_aglomerado_si_no_existe(db, producto_origen_limpio)

    if clasificacion_limpia:
        crear_clasificacion_aglomerado_si_no_existe(db, clasificacion_limpia)

    ahora = ahora_lima()

    nuevo = models.MovimientoAglomerado(
        tipo=movimiento.tipo,
        cantidad=movimiento.cantidad,
        proceso_origen=movimiento.proceso_origen,
        producto_origen=producto_origen_limpio,
        orden_id=orden_id,
        clasificacion=clasificacion_limpia,
        operario_id=operario.id,
        observacion=movimiento.observacion,
        fecha=ahora.date(),
        hora=ahora.time()
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    nuevo.codigo_orden = nuevo.orden_obj.codigo if nuevo.orden_obj else None
    nuevo.nombre_operario = nuevo.operario_obj.nombre

    return nuevo


def obtener_movimientos_aglomerado(db: Session):
    movimientos = (
        db.query(models.MovimientoAglomerado)
        .order_by(models.MovimientoAglomerado.id.desc())
        .all()
    )

    for mov in movimientos:
        mov.codigo_orden = mov.orden_obj.codigo if mov.orden_obj else None
        mov.nombre_operario = mov.operario_obj.nombre

    return movimientos


def calcular_saldo_aglomerado(db: Session):
    todos = (
        db.query(models.MovimientoAglomerado)
        .order_by(models.MovimientoAglomerado.id.asc())
        .all()
    )

    saldo = 0
    for mov in todos:
        if mov.tipo == "ajuste":
            saldo = float(mov.cantidad)
        elif mov.tipo == "entrada":
            saldo += float(mov.cantidad)
        elif mov.tipo == "salida":
            saldo -= float(mov.cantidad)

    return saldo


def eliminar_movimiento_aglomerado(db: Session, movimiento_id: int):
    movimiento = db.get(models.MovimientoAglomerado, movimiento_id)

    if movimiento is None:
        raise HTTPException(
            status_code=404,
            detail="El movimiento de aglomerado no existe."
        )

    db.delete(movimiento)
    db.commit()
    
    
# =========================
# REPORTES
# =========================

def merma_efectiva(movimiento) -> float:
    return float(movimiento.merma_real) if movimiento.merma_real is not None else 0.0


def reporte_resumen(db: Session, desde: str | None, hasta: str | None, agrupar_por: str):
    query = db.query(models.Movimiento)

    if desde:
        query = query.filter(models.Movimiento.fecha >= desde)
    if hasta:
        query = query.filter(models.Movimiento.fecha <= hasta)

    movimientos = query.all()

    grupos = {}

    for mov in movimientos:
        if agrupar_por == "proceso":
            etiqueta = mov.proceso
        elif agrupar_por == "maquina":
            etiqueta = mov.maquina
        elif agrupar_por == "operario":
            operario = db.get(models.Operario, mov.operario_id)
            etiqueta = operario.nombre if operario else "Desconocido"
        elif agrupar_por == "cliente":
            orden = db.get(models.OrdenProduccion, mov.orden_id)
            cliente = orden.cliente_obj if orden else None
            etiqueta = cliente.nombre if cliente else "Desconocido"
        else:
            raise HTTPException(status_code=400, detail="Agrupación no válida.")

        if etiqueta not in grupos:
            grupos[etiqueta] = {
                "etiqueta": etiqueta, "entrada": 0, "salida": 0, "merma": 0,
                "movimientos": 0, "movimientos_con_merma": 0, "movimientos_sin_merma": 0
            }

        tiene_merma = (
            db.query(models.DetalleMerma.id)
            .filter(models.DetalleMerma.movimiento_id == mov.id)
            .first()
        ) is not None

        grupos[etiqueta]["entrada"] += float(mov.entrada or 0)
        grupos[etiqueta]["salida"] += float(mov.salida or 0)
        grupos[etiqueta]["merma"] += merma_efectiva(mov)
        grupos[etiqueta]["movimientos"] += 1
        if tiene_merma:
            grupos[etiqueta]["movimientos_con_merma"] += 1
        else:
            grupos[etiqueta]["movimientos_sin_merma"] += 1

    resultado = list(grupos.values())
    resultado.sort(key=lambda g: g["merma"], reverse=True)

    return resultado


def reporte_orden(db: Session, codigo: str):
    orden = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.codigo.ilike(codigo.strip()))
        .first()
    )

    if orden is None:
        raise HTTPException(status_code=404, detail="No se encontró ninguna Orden con ese código.")

    movimientos = (
        db.query(models.Movimiento)
        .filter(models.Movimiento.orden_id == orden.id)
        .order_by(models.Movimiento.id.asc())
        .all()
    )

    pasos = []
    total_entrada = 0
    total_salida = 0
    total_merma = 0

    for mov in movimientos:
        operario = db.get(models.Operario, mov.operario_id)
        merma = merma_efectiva(mov)

        pasos.append({
            "proceso": mov.proceso,
            "maquina": mov.maquina,
            "operario": operario.nombre if operario else "Desconocido",
            "entrada": float(mov.entrada or 0),
            "salida": float(mov.salida or 0),
            "merma": merma,
            "observacion": mov.observacion,
            "fecha": mov.fecha,
            "hora": mov.hora
        })

        total_entrada += float(mov.entrada or 0)
        total_salida += float(mov.salida or 0)
        total_merma += merma

    return {
        "codigo": orden.codigo,
        "cliente": orden.cliente_obj.nombre,
        "descripcion": orden.descripcion,
        "cantidad": float(orden.cantidad),
        "unidad": orden.unidad,
        "pasos": pasos,
        "total_entrada": total_entrada,
        "total_salida": total_salida,
        "total_merma": total_merma
    }
    
    
PROCESOS_ESPECIALES = ['Extrusión', 'Impresión', 'Corte', 'Sellado', 'Laminado']


def editar_movimiento(db: Session, movimiento_id: int, datos: schemas.MovimientoEditar):
    movimiento = db.get(models.Movimiento, movimiento_id)
    if movimiento is None:
        raise HTTPException(status_code=404, detail="El movimiento no existe.")

    codigo_orden_limpio = datos.codigo_orden.strip()
    if not codigo_orden_limpio:
        raise HTTPException(status_code=400, detail="El código de orden no puede estar vacío.")

    orden = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.codigo.ilike(codigo_orden_limpio))
        .first()
    )
    if orden is None:
        raise HTTPException(status_code=400, detail="No se encontró ninguna Orden con ese código.")

    nombre_operario_limpio = datos.nombre_operario.strip()
    if not nombre_operario_limpio:
        raise HTTPException(status_code=400, detail="El nombre del operario no puede estar vacío.")

    operario = (
        db.query(models.Operario)
        .filter(models.Operario.nombre.ilike(nombre_operario_limpio))
        .first()
    )
    if operario is None:
        operario = models.Operario(nombre=nombre_operario_limpio)
        db.add(operario)
        db.commit()
        db.refresh(operario)

    movimiento.orden_id = orden.id
    movimiento.proceso = datos.proceso
    movimiento.operario_id = operario.id
    movimiento.maquina = datos.maquina
    movimiento.unidad = datos.unidad
    movimiento.observacion = datos.observacion
    movimiento.hora_inicio = datos.hora_inicio
    movimiento.hora_fin = datos.hora_fin

    if movimiento.proceso not in PROCESOS_ESPECIALES:
        if datos.entrada is not None:
            movimiento.entrada = datos.entrada
        if datos.salida is not None:
            movimiento.salida = datos.salida
        movimiento.merma = movimiento.entrada - movimiento.salida

    db.commit()
    db.refresh(movimiento)

    return movimiento

def reporte_por_tipo_merma(db: Session, desde: str | None, hasta: str | None):
    query = (
        db.query(models.DetalleMerma)
        .join(models.Movimiento, models.DetalleMerma.movimiento_id == models.Movimiento.id)
    )

    if desde:
        query = query.filter(models.Movimiento.fecha >= desde)
    if hasta:
        query = query.filter(models.Movimiento.fecha <= hasta)

    detalles = query.all()

    grupos = {}
    for d in detalles:
        etiqueta = d.tipo_merma.strip() if d.tipo_merma and d.tipo_merma.strip() else "Sin especificar"
        if etiqueta not in grupos:
            grupos[etiqueta] = {"etiqueta": etiqueta, "peso": 0, "registros": 0}
        grupos[etiqueta]["peso"] += float(d.peso)
        grupos[etiqueta]["registros"] += 1

    resultado = list(grupos.values())
    resultado.sort(key=lambda g: g["peso"], reverse=True)
    return resultado

def crear_siguiente_movimiento(db: Session, orden_id: int):
    orden = db.get(models.OrdenProduccion, orden_id)
    if orden is None:
        raise HTTPException(status_code=404, detail="La Orden de Producción no existe.")

    if not orden.procesos_plan:
        return {"siguiente_proceso": None, "movimiento": None, "mensaje": "Esta orden no tiene una ruta de producción definida."}

    ruta = orden.procesos_plan.split(",")

    movimientos_existentes = (
        db.query(models.Movimiento)
        .filter(models.Movimiento.orden_id == orden_id)
        .order_by(models.Movimiento.id.asc())
        .all()
    )
    procesos_completados = {m.proceso for m in movimientos_existentes}

    siguiente = None
    for proceso in ruta:
        if proceso not in procesos_completados:
            siguiente = proceso
            break

    if siguiente is None:
        return {"siguiente_proceso": None, "movimiento": None, "mensaje": "Ya se completaron todos los procesos de la ruta."}

    ultimo_movimiento = movimientos_existentes[-1] if movimientos_existentes else None

    ahora = ahora_lima()

    nuevo_movimiento = models.Movimiento(
        orden_id=orden_id,
        proceso=siguiente,
        operario_id=None,
        maquina=None,
        entrada=0,
        salida=0,
        unidad=ultimo_movimiento.unidad if ultimo_movimiento else "kg",
        merma=0,
        fecha=ahora.date(),
        hora=ahora.time()
    )
    db.add(nuevo_movimiento)
    db.commit()
    db.refresh(nuevo_movimiento)

    if ultimo_movimiento:
        bobinas_salida_anterior = (
            db.query(models.DetalleMovimiento)
            .filter(models.DetalleMovimiento.movimiento_id == ultimo_movimiento.id)
            .filter(models.DetalleMovimiento.lado == "salida")
            .order_by(models.DetalleMovimiento.numero)
            .all()
        )

        for i, bobina in enumerate(bobinas_salida_anterior, start=1):
            nueva_bobina = models.DetalleMovimiento(
                movimiento_id=nuevo_movimiento.id,
                tipo="bobina",
                lado="entrada",
                numero=i,
                peso_bruto=bobina.peso_neto,
                peso_tuco=0,
                peso_neto=bobina.peso_neto,
                millares=None,
                tipo_material=bobina.tipo_material
            )
            db.add(nueva_bobina)

        db.commit()
        actualizar_totales_movimiento(db, nuevo_movimiento.id)
        db.refresh(nuevo_movimiento)

    return {"siguiente_proceso": siguiente, "movimiento": nuevo_movimiento, "mensaje": None}

def importar_bobinas_anteriores(db: Session, movimiento_id: int):
    movimiento = db.get(models.Movimiento, movimiento_id)
    if movimiento is None:
        raise HTTPException(status_code=404, detail="El movimiento no existe.")

    anterior = (
        db.query(models.Movimiento)
        .filter(models.Movimiento.orden_id == movimiento.orden_id)
        .filter(models.Movimiento.id < movimiento.id)
        .order_by(models.Movimiento.id.desc())
        .first()
    )

    if anterior is None:
        raise HTTPException(status_code=400, detail="No hay un proceso anterior registrado en esta orden.")

    bobinas_salida = (
        db.query(models.DetalleMovimiento)
        .filter(models.DetalleMovimiento.movimiento_id == anterior.id)
        .filter(models.DetalleMovimiento.lado == "salida")
        .order_by(models.DetalleMovimiento.numero)
        .all()
    )

    if not bobinas_salida:
        raise HTTPException(status_code=400, detail=f"El proceso anterior ({anterior.proceso}) no tiene bobinas de salida registradas.")

    existentes = (
        db.query(models.DetalleMovimiento)
        .filter(models.DetalleMovimiento.movimiento_id == movimiento_id)
        .filter(models.DetalleMovimiento.lado == "entrada")
        .count()
    )

    for i, bobina in enumerate(bobinas_salida, start=existentes + 1):
        nueva = models.DetalleMovimiento(
            movimiento_id=movimiento_id,
            tipo="bobina",
            lado="entrada",
            numero=i,
            peso_bruto=bobina.peso_bruto,
            peso_tuco=bobina.peso_tuco,
            peso_neto=bobina.peso_neto,
            millares=None,
            tipo_material=bobina.tipo_material
        )
        db.add(nueva)

    db.commit()
    actualizar_totales_movimiento(db, movimiento_id)

    return {"importadas": len(bobinas_salida)}

def editar_orden_produccion(
    db: Session,
    orden_id: int,
    orden_nueva: schemas.OrdenProduccionCreate
):
    orden = db.get(models.OrdenProduccion, orden_id)

    if orden is None:
        raise HTTPException(status_code=404, detail="La Orden de Producción no existe.")

    ruc_limpio = orden_nueva.ruc.strip() if orden_nueva.ruc and orden_nueva.ruc.strip() else None
    nombre_cliente_limpio = orden_nueva.nombre_cliente.strip() if orden_nueva.nombre_cliente else None

    cliente = None
    if ruc_limpio:
        cliente = (
            db.query(models.Cliente)
            .filter(models.Cliente.ruc == ruc_limpio)
            .first()
        )
    elif nombre_cliente_limpio:
        cliente = (
            db.query(models.Cliente)
            .filter(models.Cliente.ruc.is_(None))
            .filter(models.Cliente.nombre.ilike(nombre_cliente_limpio))
            .first()
        )

    if cliente is None:
        if not nombre_cliente_limpio:
            raise HTTPException(
                status_code=400,
                detail="Cliente no encontrado. Debe ingresar el nombre."
            )
        cliente = models.Cliente(
            ruc=ruc_limpio,
            nombre=nombre_cliente_limpio
        )
        db.add(cliente)
        db.commit()
        db.refresh(cliente)

    if orden_nueva.unidad_precio == "millares" and not orden_nueva.millares:
        raise HTTPException(status_code=400, detail="Debes indicar los millares si el precio es por millar.")

    costo_total_calc = None
    if orden_nueva.precio_unitario is not None and orden_nueva.unidad_precio:
        if orden_nueva.unidad_precio == "millares":
            costo_total_calc = float(orden_nueva.precio_unitario) * float(orden_nueva.millares)
        else:
            costo_total_calc = float(orden_nueva.precio_unitario) * float(orden_nueva.cantidad)

    if orden_nueva.vendedor and orden_nueva.vendedor.strip():
        crear_vendedor_si_no_existe(db, orden_nueva.vendedor.strip())

    orden.codigo = orden_nueva.codigo
    orden.cliente_id = cliente.id
    orden.numero_std = orden_nueva.numero_std
    orden.descripcion = orden_nueva.descripcion
    orden.medidas = orden_nueva.medidas
    orden.cantidad = orden_nueva.cantidad
    orden.unidad = orden_nueva.unidad
    orden.estado = orden_nueva.estado
    if orden_nueva.procesos_plan is not None:
        orden.procesos_plan = orden_nueva.procesos_plan
    orden.tipo_trabajo = orden_nueva.tipo_trabajo
    orden.moneda = orden_nueva.moneda
    orden.vendedor = orden_nueva.vendedor.strip() if orden_nueva.vendedor and orden_nueva.vendedor.strip() else None
    orden.fecha_entrega = orden_nueva.fecha_entrega
    orden.precio_unitario = orden_nueva.precio_unitario
    orden.unidad_precio = orden_nueva.unidad_precio
    orden.millares = orden_nueva.millares
    orden.costo_total = costo_total_calc
    orden.direccion_entrega = orden_nueva.direccion_entrega
    orden.numero_contacto = orden_nueva.numero_contacto
    orden.email_cliente = orden_nueva.email_cliente
    orden.telefono_cliente = orden_nueva.telefono_cliente

    db.commit()
    db.refresh(orden)

    orden.ruc = cliente.ruc
    orden.cliente = cliente.nombre

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

def aprobar_orden_preaprobada(db: Session, orden_id: int):
    orden = db.get(models.OrdenProduccion, orden_id)
    if orden is None:
        raise HTTPException(status_code=404, detail="La Orden de Producción no existe.")

    if orden.estado != "Preaprobada":
        raise HTTPException(status_code=400, detail="Esta orden no está en estado Preaprobada.")

    orden.estado = "Pendiente"
    db.commit()
    db.refresh(orden)

    orden.ruc = orden.cliente_obj.ruc
    orden.cliente = orden.cliente_obj.nombre
    orden.ultimo_proceso = "Sin iniciar"

    return orden


def obtener_ordenes_preaprobadas(db: Session):
    ordenes = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.estado == "Preaprobada")
        .order_by(models.OrdenProduccion.id.desc())
        .all()
    )

    for orden in ordenes:
        orden.ruc = orden.cliente_obj.ruc
        orden.cliente = orden.cliente_obj.nombre
        orden.ultimo_proceso = "Sin iniciar"

    return ordenes


def obtener_orden_por_id(db: Session, orden_id: int):
    orden = db.get(models.OrdenProduccion, orden_id)
    if orden is None:
        raise HTTPException(status_code=404, detail="La Orden de Producción no existe.")

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


def obtener_ordenes_seguimiento(db: Session):
    ordenes = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.estado != "Preaprobada")
        .order_by(models.OrdenProduccion.fecha_entrega.asc().nullslast())
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
        proceso_actual = ultimo_movimiento.proceso if ultimo_movimiento else None
        orden.ultimo_proceso = proceso_actual or "Sin iniciar"
        orden.estado = calcular_estado(proceso_actual)

    return ordenes


def reporte_liquidacion(db: Session, codigo: str):
    orden = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.codigo.ilike(codigo.strip()))
        .first()
    )
    if orden is None:
        raise HTTPException(status_code=404, detail="No se encontró ninguna Orden con ese código.")

    movimientos = (
        db.query(models.Movimiento)
        .filter(models.Movimiento.orden_id == orden.id)
        .order_by(models.Movimiento.id.asc())
        .all()
    )

    materiales_extrusion = []
    procesos = []

    for mov in movimientos:
        operario = db.get(models.Operario, mov.operario_id)

        detalles = (
            db.query(models.DetalleMovimiento)
            .filter(models.DetalleMovimiento.movimiento_id == mov.id)
            .order_by(models.DetalleMovimiento.numero)
            .all()
        )

        if mov.proceso == "Extrusión":
            for d in detalles:
                if d.tipo == "material":
                    materiales_extrusion.append({
                        "tipo_material": d.tipo_material,
                        "cantidad": float(d.peso_bruto)
                    })

        bobinas_salida = [
            {
                "numero": d.numero,
                "peso_bruto": float(d.peso_bruto),
                "peso_tuco": float(d.peso_tuco) if d.peso_tuco is not None else 0,
                "peso_neto": float(d.peso_neto),
                "millares": float(d.millares) if d.millares is not None else None,
                "tipo_material": d.tipo_material
            }
            for d in detalles
            if d.lado == "salida" and d.tipo != "material"
        ]

        mermas = (
            db.query(models.DetalleMerma)
            .filter(models.DetalleMerma.movimiento_id == mov.id)
            .all()
        )

        procesos.append({
            "proceso": mov.proceso,
            "maquina": mov.maquina,
            "operario": operario.nombre if operario else "Desconocido",
            "entrada": float(mov.entrada or 0),
            "salida": float(mov.salida or 0),
            "unidad": mov.unidad,
            "observacion": mov.observacion,
            "fecha": mov.fecha,
            "hora": mov.hora,
            "hora_inicio": mov.hora_inicio,
            "hora_fin": mov.hora_fin,
            "bobinas_salida": bobinas_salida,
            "mermas": [{"peso": float(m.peso), "tipo_merma": m.tipo_merma} for m in mermas]
        })

    return {
        "codigo": orden.codigo,
        "cliente": orden.cliente_obj.nombre,
        "ruc": orden.cliente_obj.ruc,
        "descripcion": orden.descripcion,
        "cantidad": float(orden.cantidad),
        "unidad": orden.unidad,
        "fecha": orden.fecha,
        "materiales_extrusion": materiales_extrusion,
        "procesos": procesos
    }
    
def obtener_maquinas_unicas(db: Session):
    resultados = (
        db.query(models.Movimiento.maquina)
        .filter(models.Movimiento.maquina.isnot(None))
        .distinct()
        .order_by(models.Movimiento.maquina)
        .all()
    )
    return [r[0] for r in resultados]


# =========================
# ALERTAS / ANOMALÍAS DE PRODUCCIÓN
# =========================

def _alertas_ordenes_sin_movimientos(db: Session):
    ordenes = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.estado != "Preaprobada")
        .all()
    )
    resultado = []
    for orden in ordenes:
        existe = db.query(models.Movimiento.id).filter(models.Movimiento.orden_id == orden.id).first()
        if existe is None:
            resultado.append({
                "codigo": orden.codigo,
                "cliente": orden.cliente_obj.nombre,
                "fecha": orden.fecha
            })
    resultado.sort(key=lambda x: x["fecha"])
    return resultado


def _alertas_ordenes_estancadas(db: Session, dias_estancado: int):
    hoy = ahora_lima().date()
    ordenes = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.estado.notin_(["Preaprobada", "Terminado"]))
        .all()
    )
    resultado = []
    for orden in ordenes:
        ultimo = (
            db.query(models.Movimiento)
            .filter(models.Movimiento.orden_id == orden.id)
            .order_by(models.Movimiento.fecha.desc(), models.Movimiento.id.desc())
            .first()
        )
        if ultimo is None:
            continue

        dias = (hoy - ultimo.fecha).days
        if dias >= dias_estancado:
            resultado.append({
                "codigo": orden.codigo,
                "cliente": orden.cliente_obj.nombre,
                "ultimo_proceso": ultimo.proceso,
                "dias_sin_movimiento": dias,
                "fecha_ultimo_movimiento": ultimo.fecha
            })

    resultado.sort(key=lambda x: x["dias_sin_movimiento"], reverse=True)
    return resultado


def _alertas_dias_pocos_movimientos(db: Session, dias_analisis: int, umbral: int):
    hoy = ahora_lima().date()
    resultado = []
    for i in range(dias_analisis):
        dia = hoy - timedelta(days=i)
        cantidad = db.query(models.Movimiento).filter(models.Movimiento.fecha == dia).count()
        if cantidad <= umbral:
            resultado.append({"fecha": dia, "movimientos": cantidad})

    resultado.sort(key=lambda x: x["fecha"])
    return resultado


def _alertas_movimientos_sin_merma(db: Session, desde: str | None, hasta: str | None):
    query = db.query(models.Movimiento)
    if desde:
        query = query.filter(models.Movimiento.fecha >= desde)
    if hasta:
        query = query.filter(models.Movimiento.fecha <= hasta)

    movimientos = query.order_by(models.Movimiento.fecha.desc()).all()

    resultado = []
    for mov in movimientos:
        tiene_merma = (
            db.query(models.DetalleMerma.id)
            .filter(models.DetalleMerma.movimiento_id == mov.id)
            .first()
        )
        if tiene_merma is None:
            orden = db.get(models.OrdenProduccion, mov.orden_id)
            resultado.append({
                "movimiento_id": mov.id,
                "codigo_orden": orden.codigo if orden else "-",
                "proceso": mov.proceso,
                "maquina": mov.maquina,
                "fecha": mov.fecha
            })
    return resultado


def _alertas_maquinas_top_merma(db: Session, desde: str | None, hasta: str | None):
    query = (
        db.query(models.DetalleMerma)
        .join(models.Movimiento, models.DetalleMerma.movimiento_id == models.Movimiento.id)
    )
    if desde:
        query = query.filter(models.Movimiento.fecha >= desde)
    if hasta:
        query = query.filter(models.Movimiento.fecha <= hasta)

    detalles = query.all()

    grupos = {}
    for d in detalles:
        mov = db.get(models.Movimiento, d.movimiento_id)
        maquina = mov.maquina or "Sin máquina"
        if maquina not in grupos:
            grupos[maquina] = {"maquina": maquina, "merma": 0, "registros": 0}
        grupos[maquina]["merma"] += float(d.peso)
        grupos[maquina]["registros"] += 1

    resultado = list(grupos.values())
    resultado.sort(key=lambda g: g["merma"], reverse=True)
    return resultado[:10]


def _alertas_ordenes_merma_excesiva(db: Session, desde: str | None, hasta: str | None):
    """
    Detecta movimientos con merma_real anormalmente alta comparada con el
    promedio de su MISMO proceso (no una meta inventada, sino una desviación
    estadística sobre datos reales). Requiere al menos 5 movimientos con
    merma registrada en ese proceso para evaluar, para no sacar conclusiones
    con poca muestra.
    """
    query = db.query(models.Movimiento).filter(models.Movimiento.merma_real.isnot(None))
    if desde:
        query = query.filter(models.Movimiento.fecha >= desde)
    if hasta:
        query = query.filter(models.Movimiento.fecha <= hasta)

    movimientos = query.all()

    por_proceso = {}
    for mov in movimientos:
        por_proceso.setdefault(mov.proceso, []).append(mov)

    resultado = []
    for lista in por_proceso.values():
        valores = [float(m.merma_real) for m in lista if m.merma_real is not None]
        if len(valores) < 5:
            continue

        promedio = statistics.mean(valores)
        desviacion = statistics.pstdev(valores)
        if desviacion == 0:
            continue

        umbral = promedio + 2 * desviacion
        for mov in lista:
            if mov.merma_real is not None and float(mov.merma_real) > umbral:
                orden = db.get(models.OrdenProduccion, mov.orden_id)
                resultado.append({
                    "movimiento_id": mov.id,
                    "codigo_orden": orden.codigo if orden else "-",
                    "proceso": mov.proceso,
                    "maquina": mov.maquina,
                    "merma_real": float(mov.merma_real),
                    "promedio_proceso": round(promedio, 2),
                    "fecha": mov.fecha
                })

    resultado.sort(key=lambda x: x["merma_real"], reverse=True)
    return resultado


def reporte_alertas(
    db: Session,
    desde: str | None = None,
    hasta: str | None = None,
    dias_estancado: int = 3,
    umbral_pocos_movimientos: int = 3,
    dias_analisis: int = 14
):
    return {
        "ordenes_sin_movimientos": _alertas_ordenes_sin_movimientos(db),
        "ordenes_estancadas": _alertas_ordenes_estancadas(db, dias_estancado),
        "dias_pocos_movimientos": _alertas_dias_pocos_movimientos(db, dias_analisis, umbral_pocos_movimientos),
        "movimientos_sin_merma": _alertas_movimientos_sin_merma(db, desde, hasta),
        "maquinas_top_merma": _alertas_maquinas_top_merma(db, desde, hasta),
        "ordenes_merma_excesiva": _alertas_ordenes_merma_excesiva(db, desde, hasta)
    }