"""Regla de negocio: fecha de vencimiento de declaraciones mensuales del SRI.

Las declaraciones mensuales (IVA, retenciones) de un período se presentan
el mes siguiente, en un día que depende del noveno dígito del RUC:

    1→10, 2→12, 3→14, 4→16, 5→18, 6→20, 7→22, 8→24, 9→26, 0→28

Simplificación: no se aplica el traslado por feriados o fines de semana, ni
los calendarios especiales (contribuyentes especiales, Galápagos, etc.).
Verificar siempre el calendario vigente en sri.gob.ec.
"""
import re
from datetime import date

DIA_POR_NOVENO_DIGITO = {1: 10, 2: 12, 3: 14, 4: 16, 5: 18,
                         6: 20, 7: 22, 8: 24, 9: 26, 0: 28}

_RUC_RE = re.compile(r"^\d{10}001$")
_PERIODO_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def ruc_valido(ruc: str) -> bool:
    """Validación de formato (13 dígitos terminados en 001). No valida el dígito verificador."""
    return bool(_RUC_RE.match(ruc))


def periodo_valido(periodo: str) -> bool:
    return bool(_PERIODO_RE.match(periodo))


def noveno_digito(ruc: str) -> int:
    return int(ruc[8])


def fecha_vencimiento_mensual(ruc: str, periodo: str) -> date:
    """Fecha máxima para declarar el período 'YYYY-MM' (se declara el mes siguiente)."""
    anio, mes = map(int, periodo.split("-"))
    anio, mes = (anio + 1, 1) if mes == 12 else (anio, mes + 1)
    return date(anio, mes, DIA_POR_NOVENO_DIGITO[noveno_digito(ruc)])


def periodo_anterior(hoy: date) -> str:
    """Último período cerrado respecto a 'hoy' (el mes anterior)."""
    anio, mes = (hoy.year - 1, 12) if hoy.month == 1 else (hoy.year, hoy.month - 1)
    return f"{anio:04d}-{mes:02d}"
