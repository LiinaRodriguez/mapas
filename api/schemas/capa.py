"""Pydantic schemas for Capa (Layer)."""

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class CapaOut(BaseModel):
    id: int
    usuario_id: int
    nombre_personalizado: str
    nombre_original: str
    tipo_archivo: Optional[str] = None
    color: str
    created_at: datetime
    datos_geojson: Optional[Any] = None

    model_config = {"from_attributes": True}


class CapaListOut(BaseModel):
    """Lightweight version without geojson for listing."""
    id: int
    usuario_id: int
    nombre_personalizado: str
    nombre_original: str
    tipo_archivo: Optional[str] = None
    color: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CapaUpdate(BaseModel):
    nombre_personalizado: Optional[str] = None
    color: Optional[str] = None
