"""Pydantic schemas for authentication."""

from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    es_licenciado: bool = False
    numero_licencia: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    nombre: str
    email: str
    es_licenciado: bool
    numero_licencia: Optional[str] = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    es_licenciado: Optional[bool] = None
    numero_licencia: Optional[str] = None
