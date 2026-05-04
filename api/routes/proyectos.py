from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from api.core.database import get_db
from api.core.security import get_current_user
from api.models.usuario import Usuario
from api.models.proyecto import Proyecto
from api.schemas.proyecto import ProyectoCreate, ProyectoUpdate, ProyectoOut

router = APIRouter(prefix="/proyectos", tags=["proyectos"])


@router.get("", response_model=List[ProyectoOut])
def list_proyectos(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proyectos = (
        db.query(Proyecto)
        .filter(Proyecto.usuario_id == current_user.id)
        .order_by(Proyecto.updated_at.desc())
        .all()
    )
    result = []
    for p in proyectos:
        out = ProyectoOut.model_validate(p)
        out.capas_count = len(p.capas) if p.capas else 0
        result.append(out)
    return result


@router.post("", response_model=ProyectoOut, status_code=status.HTTP_201_CREATED)
def create_proyecto(
    body: ProyectoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proyecto = Proyecto(
        nombre=body.nombre,
        descripcion=body.descripcion,
        usuario_id=current_user.id,
    )
    db.add(proyecto)
    db.commit()
    db.refresh(proyecto)

    out = ProyectoOut.model_validate(proyecto)
    out.capas_count = 0
    return out


@router.get("/{proyecto_id}", response_model=ProyectoOut)
def get_proyecto(
    proyecto_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proyecto = (
        db.query(Proyecto)
        .filter(Proyecto.id == proyecto_id, Proyecto.usuario_id == current_user.id)
        .first()
    )
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    out = ProyectoOut.model_validate(proyecto)
    out.capas_count = len(proyecto.capas) if proyecto.capas else 0
    return out


@router.patch("/{proyecto_id}", response_model=ProyectoOut)
def update_proyecto(
    proyecto_id: int,
    body: ProyectoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proyecto = (
        db.query(Proyecto)
        .filter(Proyecto.id == proyecto_id, Proyecto.usuario_id == current_user.id)
        .first()
    )
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if body.nombre is not None:
        proyecto.nombre = body.nombre
    if body.descripcion is not None:
        proyecto.descripcion = body.descripcion

    db.commit()
    db.refresh(proyecto)

    out = ProyectoOut.model_validate(proyecto)
    out.capas_count = len(proyecto.capas) if proyecto.capas else 0
    return out


@router.delete("/{proyecto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proyecto(
    proyecto_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proyecto = (
        db.query(Proyecto)
        .filter(Proyecto.id == proyecto_id, Proyecto.usuario_id == current_user.id)
        .first()
    )
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    db.delete(proyecto)
    db.commit()
