"""Pydantic schemas for Proyecto (Project)."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProyectoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class ProyectoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class ProyectoOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    capas_count: int = 0

    model_config = {"from_attributes": True}
