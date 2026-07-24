from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine

from routers.ordenes import router as ordenes_router
from routers.movimientos import router as movimientos_router
from routers.clientes import router as clientes_router
from routers.operarios import router as operarios_router

Base.metadata.create_all(bind=engine)

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



@app.get("/")
def root():
    return {"mensaje": "PackTech funcionando"}