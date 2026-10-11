from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from .vencimientos import periodo_valido, ruc_valido


class ClienteIn(BaseModel):
    ruc: str = Field(..., examples=["1799999910001"])
    razon_social: str = Field(..., min_length=3, max_length=150)
    email: Optional[EmailStr] = None

    @field_validator("ruc")
    @classmethod
    def validar_ruc(cls, v: str) -> str:
        v = v.strip()
        if not ruc_valido(v):
            raise ValueError("El RUC debe tener 13 dígitos y terminar en 001")
        return v


class Cliente(BaseModel):
    id: int
    ruc: str
    razon_social: str
    email: Optional[str] = None


class ClienteCreado(Cliente):
    obligaciones_generadas: int


class Obligacion(BaseModel):
    id: int
    cliente_id: int
    razon_social: str
    ruc: str
    tipo: str
    tipo_nombre: str
    periodo: str
    fecha_vencimiento: date
    estado: Literal["pendiente", "presentada", "vencida"]
    dias_restantes: int


class ResumenCliente(BaseModel):
    cliente_id: int
    ruc: str
    razon_social: str
    total: int
    presentadas: int
    por_vencer: int
    vencidas: int


class ClienteConVencidas(BaseModel):
    cliente_id: int
    ruc: str
    razon_social: str
    vencidas: int
    vencida_desde: date


class GenerarPeriodoIn(BaseModel):
    periodo: str = Field(..., examples=["2026-09"])

    @field_validator("periodo")
    @classmethod
    def validar_periodo(cls, v: str) -> str:
        if not periodo_valido(v):
            raise ValueError("El período debe tener el formato YYYY-MM")
        return v


class GenerarPeriodoOut(BaseModel):
    periodo: str
    creadas: int
