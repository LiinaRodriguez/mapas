from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional

from api.core.database import get_db
from api.core.security import get_current_user
from api.models.usuario import Usuario
from api.models.proyecto import Proyecto
from api.models.capa import Capa, get_next_color
from api.schemas.capa import CapaOut, CapaListOut, CapaUpdate
from api.services.geo_processor import process_upload

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


@router.get("/capas", response_model=List[CapaListOut])
def list_library_capas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Capa).filter(Capa.usuario_id == current_user.id).all()


@router.get("/proyectos/{proyecto_id}/capas", response_model=List[CapaListOut])
def list_proyecto_capas(
    proyecto_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proyecto = _get_user_proyecto(proyecto_id, current_user, db)
    return proyecto.capas


@router.get("/capas/{capa_id}/geojson")
def get_capa_geojson(
    capa_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    capa = db.query(Capa).filter(Capa.id == capa_id, Capa.usuario_id == current_user.id).first()
    if not capa:
        raise HTTPException(status_code=404, detail="Capa no encontrada")
    return capa.datos_geojson


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
    if not filename.lower().endswith((".zip", ".kml")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos .zip (con SHP) o .kml",
        )

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
    )

    if proyecto_id:
        proyecto = _get_user_proyecto(proyecto_id, current_user, db)
        capa.proyectos.append(proyecto)

    db.add(capa)
    db.commit()
    db.refresh(capa)

    return capa


@router.post("/proyectos/{proyecto_id}/capas/{capa_id}", response_model=CapaOut)
def link_capa_to_proyecto(
    proyecto_id: int,
    capa_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proyecto = _get_user_proyecto(proyecto_id, current_user, db)
    capa = db.query(Capa).filter(Capa.id == capa_id, Capa.usuario_id == current_user.id).first()
    
    if not capa:
        raise HTTPException(status_code=404, detail="Capa no encontrada en tu librería")
    
    if capa not in proyecto.capas:
        proyecto.capas.append(capa)
        db.commit()
    
    return capa


from sqlalchemy import delete
from ..models.capa import Capa, proyecto_capa_association

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
    capa = db.query(Capa).filter(Capa.id == capa_id, Capa.usuario_id == current_user.id).first()
    if not capa:
        raise HTTPException(status_code=404, detail="Capa no encontrada")

    if body.nombre_personalizado is not None:
        capa.nombre_personalizado = body.nombre_personalizado
    if body.color is not None:
        capa.color = body.color

    db.commit()
    db.refresh(capa)
    return capa


@router.delete("/capas/{capa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_capa_permanently(
    capa_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    capa = db.query(Capa).filter(Capa.id == capa_id, Capa.usuario_id == current_user.id).first()
    if not capa:
        raise HTTPException(status_code=404, detail="Capa no encontrada")

    db.delete(capa)
    db.commit()
    return None
