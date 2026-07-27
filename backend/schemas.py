from datetime import date, time, datetime
from pydantic import BaseModel

class ClienteCreate(BaseModel):
    ruc: str
    nombre: str


class ClienteResponse(BaseModel):
    id: int
    ruc: str
    nombre: str

    class Config:
        from_attributes = True

class OrdenProduccionCreate(BaseModel):
    codigo: str
    cliente_id: int
    numero_std: int
    descripcion: str | None = None
    cantidad: float
    unidad: str
    estado: str | None = "Pendiente"

class OrdenProduccionResponse(BaseModel):
    id: int
    codigo: str
    cliente_id: int
    numero_std: int
    descripcion: str | None = None
    cantidad: float
    unidad: str
    estado: str | None
    fecha: date
    hora: time
    ruc: str
    cliente: str
    ultimo_proceso: str

    class Config:
        from_attributes = True


class MovimientoCreate(BaseModel):
    orden_id: int
    proceso: str
    operario_id: int
    maquina: str
    entrada: float
    salida: float
    unidad: str
    merma: float
    observacion: str | None = None


class MovimientoResponse(BaseModel):
    id: int
    orden_id: int
    proceso: str
    operario_id: int
    maquina: str
    entrada: float
    salida: float
    unidad: str
    merma: float
    observacion: str | None
    fecha: date
    hora: time

    class Config:
        from_attributes = True
        
class ProductoCreate(BaseModel):
    nombre: str
    descripcion: str | None = None


class ProductoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: str | None

    class Config:
        from_attributes = True


class OperarioCreate(BaseModel):
    nombre: str
    cargo: str | None = None


class OperarioResponse(BaseModel):
    id: int
    nombre: str
    cargo: str | None

    class Config:
        from_attributes = True