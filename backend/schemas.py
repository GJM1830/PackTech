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
    ruc: str
    nombre_cliente: str | None = None
    numero_std: int
    descripcion: str | None = None
    cantidad: float
    unidad: str
    estado: str |None = "Pendiente"
    procesos_plan: str | None = None

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
    procesos_plan: str | None = None

    class Config:
        from_attributes = True


class MovimientoCreate(BaseModel):
    orden_id: int
    proceso: str
    nombre_operario: str
    maquina: str
    entrada: float = 0
    salida: float = 0
    unidad: str
    merma_real: float | None = None
    tipo_merma: str | None = None
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
    merma_real: float | None
    tipo_merma: str | None
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
        
class DetalleMovimientoCreate(BaseModel):
    tipo: str
    lado: str = "salida"
    numero: int
    peso_bruto: float
    peso_tuco: float | None = 0
    millares: float | None = None


class DetalleMovimientoResponse(BaseModel):
    id: int
    movimiento_id: int
    tipo: str
    lado: str
    numero: int
    peso_bruto: float
    peso_tuco: float | None
    peso_neto: float
    millares: float | None

    class Config:
        from_attributes = True


class TipoMermaResponse(BaseModel):
    id: int
    proceso: str
    nombre: str

    class Config:
        from_attributes = True
        
        
class LoginRequest(BaseModel):
    clave: str


class LoginResponse(BaseModel):
    rol: str
    nombre: str | None

    class Config:
        from_attributes = True