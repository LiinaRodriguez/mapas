from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from .base import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    es_licenciado = Column(Boolean, default=False)
    numero_licencia = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    proyectos = relationship(
        "Proyecto", back_populates="usuario", cascade="all, delete-orphan"
    )
    capas = relationship(
        "Capa", back_populates="usuario", cascade="all, delete-orphan"
    )
