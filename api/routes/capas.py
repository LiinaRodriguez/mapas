import tempfile
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from api.core.database import get_db
from api.core.security import get_current_user
from api.models.usuario import Usuario
from api.models.proyecto import Proyecto
from api.models.capa import Capa, get_next_color, proyecto_capa_association
from api.schemas.capa import (
    CapaListOut,
    CapaUpdate,
    ProyectoCapaOrden,
    ProyectoCapaOut,
    ProyectoCapaUpdate,
)
from api.services.geo_processor import SUPPORTED_EXTENSIONS, export_layer, process_upload

router = APIRouter(tags=["capas"])


def _get_user_proyecto(proyecto_id: int, user: Usuario, db: Session) -> Proyecto:
    proyecto = (
        db.query(Proyecto)
        .filter(Proyecto.id == proyecto_id, Proyecto.usuario_id == user.id)
        .first()
    )
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return proyecto


def _get_user_capa(capa_id: int, user: Usuario, db: Session) -> Capa:
    capa = db.query(Capa).filter(Capa.id == capa_id, Capa.usuario_id == user.id).first()
    if not capa:
        raise HTTPException(status_code=404, detail="Capa no encontrada")
    return capa


def _proyecto_capas(proyecto_id: int, db: Session, capa_id: Optional[int] = None) -> List[ProyectoCapaOut]:
    assoc = proyecto_capa_association.c
    query = (
        db.query(Capa, assoc.visible, assoc.opacidad, assoc.orden)
        .join(proyecto_capa_association, assoc.capa_id == Capa.id)
        .filter(assoc.proyecto_id == proyecto_id)
        .order_by(assoc.orden.asc(), Capa.id.asc())
    )
    if capa_id is not None:
        query = query.filter(Capa.id == capa_id)

    result = []
    for capa, visible, opacidad, orden in query.all():
        out = ProyectoCapaOut.model_validate(capa)
        out.visible = visible
        out.opacidad = opacidad
        out.orden = orden
        result.append(out)
    return result


def _link(proyecto_id: int, capa_id: int, db: Session) -> None:
    assoc = proyecto_capa_association.c
    exists = db.execute(
        select(assoc.capa_id).where(assoc.proyecto_id == proyecto_id, assoc.capa_id == capa_id)
    ).first()
    if exists:
        return
    # New layers go on top of the stack (lowest orden).
    min_orden = db.execute(
        select(func.min(assoc.orden)).where(assoc.proyecto_id == proyecto_id)
    ).scalar()
    orden = (min_orden - 1) if min_orden is not None else 0
    db.execute(
        proyecto_capa_association.insert().values(
            proyecto_id=proyecto_id, capa_id=capa_id, orden=orden
        )
    )


@router.get("/capas", response_model=List[CapaListOut])
def list_library_capas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Capa).filter(Capa.usuario_id == current_user.id).all()


@router.get("/proyectos/{proyecto_id}/capas", response_model=List[ProyectoCapaOut])
def list_proyecto_capas(
    proyecto_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_user_proyecto(proyecto_id, current_user, db)
    return _proyecto_capas(proyecto_id, db)


@router.get("/capas/{capa_id}/geojson")
def get_capa_geojson(
    capa_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_user_capa(capa_id, current_user, db).datos_geojson


@router.get("/capas/{capa_id}/descargar")
def download_capa(
    capa_id: int,
    formato: Literal["geojson", "kml", "shp"] = "geojson",
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    capa = _get_user_capa(capa_id, current_user, db)
    tmp = tempfile.TemporaryDirectory()
    try:
        path, media_type = export_layer(capa.datos_geojson, capa.nombre_personalizado, formato, tmp.name)
    except Exception as e:
        tmp.cleanup()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No se pudo exportar la capa: {str(e)}",
        )
    return FileResponse(
        path,
        media_type=media_type,
        filename=path.rsplit("/", 1)[-1],
        background=BackgroundTask(tmp.cleanup),
    )


@router.post(
    "/capas",
    response_model=CapaListOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_capa(
    proyecto_id: Optional[int] = None,
    file: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    filename = file.filename or ""
    if not filename.lower().endswith(SUPPORTED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos .zip (con SHP), .kml o .geojson",
        )

    proyecto = _get_user_proyecto(proyecto_id, current_user, db) if proyecto_id else None

    try:
        result = await process_upload(file)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando archivo: {str(e)}",
        )

    existing_count = db.query(Capa).filter(Capa.usuario_id == current_user.id).count()
    color = get_next_color(existing_count)

    capa = Capa(
        usuario_id=current_user.id,
        nombre_original=filename,
        nombre_personalizado=result["nombre"],
        datos_geojson=result["geojson"],
        tipo_archivo=result["tipo"],
        color=color,
        bounds=result["bounds"],
    )
    db.add(capa)
    db.flush()

    if proyecto:
        _link(proyecto.id, capa.id, db)

    db.commit()
    db.refresh(capa)

    return capa


@router.post("/proyectos/{proyecto_id}/capas/{capa_id}", response_model=ProyectoCapaOut)
def link_capa_to_proyecto(
    proyecto_id: int,
    capa_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_user_proyecto(proyecto_id, current_user, db)
    _get_user_capa(capa_id, current_user, db)
    _link(proyecto_id, capa_id, db)
    db.commit()
    return _proyecto_capas(proyecto_id, db, capa_id)[0]


@router.patch("/proyectos/{proyecto_id}/capas/{capa_id}", response_model=ProyectoCapaOut)
def update_proyecto_capa(
    proyecto_id: int,
    capa_id: int,
    body: ProyectoCapaUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_user_proyecto(proyecto_id, current_user, db)
    values = body.model_dump(exclude_none=True)
    assoc = proyecto_capa_association.c
    if values:
        db.execute(
            update(proyecto_capa_association)
            .where(assoc.proyecto_id == proyecto_id, assoc.capa_id == capa_id)
            .values(**values)
        )
        db.commit()
    rows = _proyecto_capas(proyecto_id, db, capa_id)
    if not rows:
        raise HTTPException(status_code=404, detail="La capa no está en este proyecto")
    return rows[0]


@router.put("/proyectos/{proyecto_id}/capas/orden", response_model=List[ProyectoCapaOut])
def reorder_proyecto_capas(
    proyecto_id: int,
    body: ProyectoCapaOrden,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """capa_ids[0] is drawn on top of every other layer."""
    _get_user_proyecto(proyecto_id, current_user, db)
    assoc = proyecto_capa_association.c
    for orden, capa_id in enumerate(body.capa_ids):
        db.execute(
            update(proyecto_capa_association)
            .where(assoc.proyecto_id == proyecto_id, assoc.capa_id == capa_id)
            .values(orden=orden)
        )
    db.commit()
    return _proyecto_capas(proyecto_id, db)


@router.delete("/proyectos/{proyecto_id}/capas/{capa_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_capa_from_proyecto(
    proyecto_id: int,
    capa_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_user_proyecto(proyecto_id, current_user, db)
    stmt = delete(proyecto_capa_association).where(
        proyecto_capa_association.c.proyecto_id == proyecto_id,
        proyecto_capa_association.c.capa_id == capa_id
    )
    db.execute(stmt)
    db.commit()

    return None


@router.patch("/capas/{capa_id}", response_model=CapaListOut)
def update_capa(
    capa_id: int,
    body: CapaUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    capa = _get_user_capa(capa_id, current_user, db)

    if body.nombre_personalizado is not None:
        capa.nombre_personalizado = body.nombre_personalizado
    if body.estilo is not None:
        capa.estilo = body.estilo.model_dump()
        capa.color = body.estilo.fillColor
    if body.color is not None:
        capa.color = body.color
        if capa.estilo:
            capa.estilo = {**capa.estilo, "fillColor": body.color, "strokeColor": body.color}

    db.commit()
    db.refresh(capa)
    return capa


@router.delete("/capas/{capa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_capa_permanently(
    capa_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    capa = _get_user_capa(capa_id, current_user, db)
    db.delete(capa)
    db.commit()
    return None
