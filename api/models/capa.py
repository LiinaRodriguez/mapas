from sqlalchemy import Boolean, Column, Float, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, deferred

from .base import Base

proyecto_capa_association = Table(
    "proyectos_capas",
    Base.metadata,
    Column("proyecto_id", Integer, ForeignKey("proyectos.id", ondelete="CASCADE"), primary_key=True),
    Column("capa_id", Integer, ForeignKey("capas.id", ondelete="CASCADE"), primary_key=True),
    Column("orden", Integer, nullable=False, server_default="0"),
    Column("visible", Boolean, nullable=False, server_default="true"),
    Column("opacidad", Float, nullable=False, server_default="1"),
)


LAYER_COLORS = [
    "#3b82f6",  
    "#ef4444",  
    "#22c55e",  
    "#f59e0b",  
    "#8b5cf6",  
    "#ec4899",  
    "#06b6d4",  
    "#f97316",  
    "#14b8a6",  
    "#a855f7",  
    "#84cc16",  
    "#e11d48",  
]

def get_next_color(existing_count: int) -> str:
    return LAYER_COLORS[existing_count % len(LAYER_COLORS)]


def default_style(color: str) -> dict:
    return {
        "fillColor": color,
        "strokeColor": color,
        "strokeWidth": 2,
        "fillOpacity": 0.25,
        "rule": None,
    }

class Capa(Base):
    __tablename__ = "capas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    nombre_original = Column(String, nullable=False)
    nombre_personalizado = Column(String, nullable=False)
    datos_geojson = deferred(Column(JSONB, nullable=False))
    tipo_archivo = Column(String) 
    color = Column(String, nullable=False, default="#3b82f6")
    estilo = Column(JSONB, nullable=True)
    bounds = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="capas")
    proyectos = relationship(
        "Proyecto", secondary=proyecto_capa_association, back_populates="capas"
    )
