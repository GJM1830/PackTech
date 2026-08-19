from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import schemas
from dependencias import obtener_db

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes"]
)


@router.get("/resumen", response_model=list[schemas.ReporteGrupo])
def resumen(
    agrupar_por: str,
    desde: str | None = None,
    hasta: str | None = None,
    db: Session = Depends(obtener_db)
):
    return crud.reporte_resumen(db, desde, hasta, agrupar_por)


@router.get("/orden/{codigo}", response_model=schemas.ReporteOrden)
def orden(
    codigo: str,
    db: Session = Depends(obtener_db)
):
    return crud.reporte_orden(db, codigo)


@router.get("/tipos-merma", response_model=list[schemas.ReporteTipoMerma])
def tipos_merma(
    desde: str | None = None,
    hasta: str | None = None,
    db: Session = Depends(obtener_db)
):
    return crud.reporte_por_tipo_merma(db, desde, hasta)