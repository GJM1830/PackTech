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

    ruc: Mapped[str] = mapped_column(
        String(11),
        unique=True,
        nullable=False
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

    numero_std: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    descripcion: Mapped[str | None] = mapped_column(
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

    operario_id: Mapped[int] = mapped_column(
        ForeignKey("operarios.id")
    )

    maquina: Mapped[str] = mapped_column(
        String(100)
    )

    entrada: Mapped[float] = mapped_column(
        Numeric(10, 2)
    )

    salida: Mapped[float] = mapped_column(
        Numeric(10, 2)
    )

    unidad: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    merma: Mapped[float] = mapped_column(
        Numeric(10, 2)
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


# =========================
# DETALLES DE MOVIMIENTO
# =========================

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

    millares: Mapped[float] = mapped_column(
        Numeric(10, 2)
    )
    
# =========================
# USUARIOS  
# =========================
    
class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clave: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False)  # admin, operario, lector
    nombre: Mapped[str | None] = mapped_column(String(100))