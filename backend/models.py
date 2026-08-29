# =========================
# IMPORTACIONES
# =========================

from datetime import datetime, date, time

from sqlalchemy import DateTime, Date, Time, Integer, String, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# =========================
# CLIENTES
# =========================

class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    ruc: Mapped[str | None] = mapped_column(
        String(11),
        unique=True,
        nullable=True
    )

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )


# =========================
# PRODUCTOS
# =========================

class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    nombre: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    descripcion: Mapped[str | None] = mapped_column(
        Text
    )


# =========================
# OPERARIOS
# =========================

class Operario(Base):
    __tablename__ = "operarios"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    nombre: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    cargo: Mapped[str | None] = mapped_column(
        String(100)
    )


# =========================
# ÓRDENES DE PRODUCCIÓN
# =========================

class OrdenProduccion(Base):
    __tablename__ = "ordenes_produccion"
    
    procesos_plan: Mapped[str | None] = mapped_column(Text)
    tipo_trabajo: Mapped[str | None] = mapped_column(String(20))

    moneda: Mapped[str | None] = mapped_column(String(10))
    vendedor: Mapped[str | None] = mapped_column(String(100))
    fecha_entrega: Mapped[date | None] = mapped_column(Date)
    precio_unitario: Mapped[float | None] = mapped_column(Numeric(10, 2))
    unidad_precio: Mapped[str | None] = mapped_column(String(20))
    millares: Mapped[float | None] = mapped_column(Numeric(10, 2))
    costo_total: Mapped[float | None] = mapped_column(Numeric(10, 2))
    direccion_entrega: Mapped[str | None] = mapped_column(String(200))
    numero_contacto: Mapped[str | None] = mapped_column(String(50))
    email_cliente: Mapped[str | None] = mapped_column(String(150))
    telefono_cliente: Mapped[str | None] = mapped_column(String(50))

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    codigo: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False
    )

    cliente_id: Mapped[int] = mapped_column(
        ForeignKey("clientes.id")
    )

    numero_std: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    descripcion: Mapped[str | None] = mapped_column(
        String(200)
    )

    medidas: Mapped[str | None] = mapped_column(
        String(200)
    )

    cantidad: Mapped[float] = mapped_column(
        Numeric(10, 2)
    )

    unidad: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    estado: Mapped[str | None] = mapped_column(
        String(50)
    )

    fecha: Mapped[date] = mapped_column(
        Date,
        default=datetime.utcnow().date
    )

    hora: Mapped[time] = mapped_column(
        Time,
        default=datetime.utcnow().time
    )

    cliente_obj: Mapped["Cliente"] = relationship("Cliente")


# =========================
# MOVIMIENTOS
# =========================

class Movimiento(Base):
    __tablename__ = "movimientos"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    orden_id: Mapped[int] = mapped_column(
        ForeignKey("ordenes_produccion.id")
    )

    proceso: Mapped[str] = mapped_column(
        String(50)
    )

    operario_id: Mapped[int | None] = mapped_column(
        ForeignKey("operarios.id")
    )

    maquina: Mapped[str | None] = mapped_column(
        String(100)
    )

    entrada: Mapped[float] = mapped_column(
        Numeric(10, 2)
    )

    salida: Mapped[float] = mapped_column(
        Numeric(10, 2)
    )
    
    tipo_laminado: Mapped[str | None] = mapped_column(String(100))

    unidad: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    merma: Mapped[float] = mapped_column(
        Numeric(10, 2)
    )
    
    merma_real: Mapped[float | None] = mapped_column(
        Numeric(10, 2)
    )
    
    tipo_merma: Mapped[str | None] = mapped_column(
        String(100)
    )

    observacion: Mapped[str | None] = mapped_column(
        Text
    )

    fecha: Mapped[date] = mapped_column(
        Date,
        default=datetime.utcnow().date
    )

    hora: Mapped[time] = mapped_column(
        Time,
        default=datetime.utcnow().time
    )
    
    hora_inicio: Mapped[str | None] = mapped_column(String(5))
    
    hora_fin: Mapped[str | None] = mapped_column(String(5))
        

# =========================
# DETALLES DE MOVIMIENTO
# =========================

class TipoMerma(Base):
    __tablename__ = "tipos_merma"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    proceso: Mapped[str] = mapped_column(String(50))
    nombre: Mapped[str] = mapped_column(String(100))
class DetalleMerma(Base):
    __tablename__ = "detalles_merma"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    movimiento_id: Mapped[int] = mapped_column(ForeignKey("movimientos.id"))
    peso: Mapped[float] = mapped_column(Numeric(10, 2))
    tipo_merma: Mapped[str | None] = mapped_column(String(100))

class DetalleMovimiento(Base):
    __tablename__ = "detalles_movimiento"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    movimiento_id: Mapped[int] = mapped_column(
        ForeignKey("movimientos.id")
    )

    tipo: Mapped[str] = mapped_column(
        String(20)
    )  # "bobina" o "fardo"

    numero: Mapped[int] = mapped_column(
        Integer
    )

    peso: Mapped[float] = mapped_column(
        Numeric(10, 2)
    )
    
    lado: Mapped[str] = mapped_column(String(10), default="salida")  # "entrada" o "salida"
    peso_bruto: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    peso_tuco: Mapped[float | None] = mapped_column(Numeric(10, 2))
    peso_neto: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    tipo_material: Mapped[str | None] = mapped_column(String(100))

    millares: Mapped[float | None] = mapped_column(
        Numeric(10, 2)
    )


class TipoMaterial(Base):
    __tablename__ = "tipos_material"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    
    
# =========================
# AGLOMERADO
# =========================

class MovimientoAglomerado(Base):
    __tablename__ = "movimientos_aglomerado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    tipo: Mapped[str] = mapped_column(String(20))  # "entrada", "salida" o "ajuste"

    cantidad: Mapped[float] = mapped_column(Numeric(10, 2))

    proceso_origen: Mapped[str | None] = mapped_column(String(50))
    producto_origen: Mapped[str | None] = mapped_column(String(200))

    orden_id: Mapped[int | None] = mapped_column(ForeignKey("ordenes_produccion.id"))
    clasificacion: Mapped[str | None] = mapped_column(String(100))

    operario_id: Mapped[int | None] = mapped_column(ForeignKey("operarios.id"))

    observacion: Mapped[str | None] = mapped_column(Text)

    detalle_merma_id: Mapped[int | None] = mapped_column(ForeignKey("detalles_merma.id"))
    origen_automatico: Mapped[bool] = mapped_column(default=False)

    fecha: Mapped[date] = mapped_column(Date, default=datetime.utcnow().date)
    hora: Mapped[time] = mapped_column(Time, default=datetime.utcnow().time)

    orden_obj: Mapped["OrdenProduccion"] = relationship("OrdenProduccion")
    operario_obj: Mapped["Operario"] = relationship("Operario")


class ProductoAglomerado(Base):
    __tablename__ = "productos_aglomerado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200))


class ClasificacionAglomerado(Base):
    __tablename__ = "clasificaciones_aglomerado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    
# =========================
# USUARIOS  
# =========================
    
class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clave: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False)  # admin, operario, lector
    nombre: Mapped[str | None] = mapped_column(String(100))
    
    
class Vendedor(Base):
    __tablename__ = "vendedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    