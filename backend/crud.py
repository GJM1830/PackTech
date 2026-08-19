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
    if cliente.ruc and cliente.ruc.strip():
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
    cliente = None
    if orden.ruc and orden.ruc.strip():
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
            ruc=orden.ruc.strip() if orden.ruc and orden.ruc.strip() else None,
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

    if movimiento.tipo_laminado and movimiento.tipo_laminado.strip():
        crear_tipo_merma_si_no_existe(db, "Laminado", movimiento.tipo_laminado.strip())

    if movimiento.tipo_merma and movimiento.tipo_merma.strip():
        crear_tipo_merma_si_no_existe(db, movimiento.proceso, movimiento.tipo_merma.strip())

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
        tipo_merma=movimiento.tipo_merma,
        tipo_laminado=movimiento.tipo_laminado,
        observacion=movimiento.observacion,
        fecha=ahora.date(),
        hora=ahora.time()
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


def obtener_movimientos(db: Session):
    return (
        db.query(models.Movimiento)
        .order_by(models.Movimiento.id.desc())
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
# DETALLES DE MERMA
# =========================

def crear_detalle_merma(db: Session, movimiento_id: int, detalle: schemas.DetalleMermaCreate):
    movimiento = db.get(models.Movimiento, movimiento_id)
    if movimiento is None:
        raise HTTPException(status_code=404, detail="El movimiento no existe.")

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

    if detalle.tipo_material and detalle.tipo_material.strip():
        crear_tipo_material_si_no_existe(db, detalle.tipo_material.strip())

    peso_tuco = detalle.peso_tuco or 0
    peso_neto = detalle.peso_bruto - peso_tuco

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


def crear_tipo_material_si_no_existe(db: Session, nombre: str):
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


def crear_movimiento_aglomerado(db: Session, movimiento: schemas.MovimientoAglomeradoCreate):
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

    if movimiento.producto_origen and movimiento.producto_origen.strip():
        crear_producto_aglomerado_si_no_existe(db, movimiento.producto_origen.strip())

    if movimiento.clasificacion and movimiento.clasificacion.strip():
        crear_clasificacion_aglomerado_si_no_existe(db, movimiento.clasificacion.strip())

    ahora = ahora_lima()

    nuevo = models.MovimientoAglomerado(
        tipo=movimiento.tipo,
        cantidad=movimiento.cantidad,
        proceso_origen=movimiento.proceso_origen,
        producto_origen=movimiento.producto_origen,
        orden_id=orden_id,
        clasificacion=movimiento.clasificacion,
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
    if movimiento.merma_real is not None:
        return float(movimiento.merma_real)
    return float(movimiento.merma or 0)


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
            grupos[etiqueta] = {"etiqueta": etiqueta, "entrada": 0, "salida": 0, "merma": 0, "movimientos": 0}

        grupos[etiqueta]["entrada"] += float(mov.entrada or 0)
        grupos[etiqueta]["salida"] += float(mov.salida or 0)
        grupos[etiqueta]["merma"] += merma_efectiva(mov)
        grupos[etiqueta]["movimientos"] += 1

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

    orden = (
        db.query(models.OrdenProduccion)
        .filter(models.OrdenProduccion.codigo.ilike(datos.codigo_orden.strip()))
        .first()
    )
    if orden is None:
        raise HTTPException(status_code=400, detail="No se encontró ninguna Orden con ese código.")

    operario = (
        db.query(models.Operario)
        .filter(models.Operario.nombre.ilike(datos.nombre_operario.strip()))
        .first()
    )
    if operario is None:
        operario = models.Operario(nombre=datos.nombre_operario.strip())
        db.add(operario)
        db.commit()
        db.refresh(operario)

    movimiento.orden_id = orden.id
    movimiento.proceso = datos.proceso
    movimiento.operario_id = operario.id
    movimiento.maquina = datos.maquina
    movimiento.unidad = datos.unidad
    movimiento.observacion = datos.observacion

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
            peso_bruto=bobina.peso_neto,
            peso_tuco=0,
            peso_neto=bobina.peso_neto,
            millares=None,
            tipo_material=bobina.tipo_material
        )
        db.add(nueva)

    db.commit()
    actualizar_totales_movimiento(db, movimiento_id)

    return {"importadas": len(bobinas_salida)}