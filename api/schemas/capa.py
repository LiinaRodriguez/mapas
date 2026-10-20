"""Pydantic schemas for Capa (Layer)."""

from pydantic import BaseModel, Field, model_validator
from typing import Optional, Any, List, Literal
from datetime import datetime


class StyleClass(BaseModel):
    value: Optional[Any] = None
    min: Optional[float] = None
    max: Optional[float] = None
    color: str
    label: Optional[str] = None


class StyleRule(BaseModel):
    type: Literal["categorical", "graduated"]
    field: str
    classes: List[StyleClass] = []


class LayerStyle(BaseModel):
    fillColor: str
    strokeColor: str
    strokeWidth: float = Field(2, ge=0, le=20)
    fillOpacity: float = Field(0.25, ge=0, le=1)
    rule: Optional[StyleRule] = None


class CapaListOut(BaseModel):
    """Lightweight version without geojson for listing."""
    id: int
    usuario_id: int
    nombre_personalizado: str
    nombre_original: str
    tipo_archivo: Optional[str] = None
    color: str
    estilo: Optional[LayerStyle] = None
    bounds: Optional[List[float]] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _fill_default_style(self):
        if self.estilo is None:
            self.estilo = LayerStyle(fillColor=self.color, strokeColor=self.color)
        return self


class CapaOut(CapaListOut):
    datos_geojson: Optional[Any] = None


class ProyectoCapaOut(CapaListOut):
    """Layer as configured inside a project (LayerConfig)."""
    visible: bool = True
    opacidad: float = 1.0
    orden: int = 0


class CapaUpdate(BaseModel):
    nombre_personalizado: Optional[str] = None
    color: Optional[str] = None
    estilo: Optional[LayerStyle] = None


class ProyectoCapaUpdate(BaseModel):
    visible: Optional[bool] = None
    opacidad: Optional[float] = Field(None, ge=0, le=1)


class ProyectoCapaOrden(BaseModel):
    capa_ids: List[int]
