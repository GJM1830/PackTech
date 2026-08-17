from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine

from routers.ordenes import router as ordenes_router
from routers.movimientos import router as movimientos_router
from routers.clientes import router as clientes_router
from routers.operarios import router as operarios_router
from routers.detalles import router as detalles_router
from routers.auth import router as auth_router
from routers.aglomerado import router as aglomerado_router
from routers.reportes import router as reportes_router
from routers.tipos_merma import router as tipos_merma_router

Base.metadata.create_all(bind=engine)

import os
from fastapi import Header, HTTPException

CLAVE_SISTEMA = os.getenv("CLAVE_SISTEMA", "packtech2026")


def verificar_clave(x_clave: str = Header(None)):
    if x_clave != CLAVE_SISTEMA:
        raise HTTPException(status_code=401, detail="Clave incorrecta o faltante.")

app = FastAPI(
    title="Sistema de Gestión de Producción",
    description="API para el registro y consulta del historial de producción de Pack Tech S.A.C.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://pack-tech.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ordenes_router)
app.include_router(movimientos_router)
app.include_router(clientes_router)
app.include_router(operarios_router)
app.include_router(detalles_router)
app.include_router(auth_router)
app.include_router(aglomerado_router)
app.include_router(reportes_router)
app.include_router(tipos_merma_router)

@app.get("/")
def root():
    return {"mensaje": "PackTech funcionando"}

