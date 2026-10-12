from datetime import date

import pytest

from app.vencimientos import (fecha_vencimiento_mensual, noveno_digito,
                              periodo_anterior, periodo_valido, ruc_valido)


@pytest.mark.parametrize("ruc, dia", [
    ("1799999910001", 10),
    ("1799999930001", 14),
    ("0999999950001", 18),
    ("0199999970001", 22),
    ("1799999900001", 28),
])
def test_dia_segun_noveno_digito(ruc, dia):
    assert fecha_vencimiento_mensual(ruc, "2026-09") == date(2026, 10, dia)


def test_tabla_completa_de_dias_por_noveno_digito():
    """Los diez dígitos siguen el patrón del SRI: 1→10, 2→12, …, 9→26, 0→28.
    mutmut no muta constantes de módulo, así que la tabla se verifica entera aquí."""
    for d in range(10):
        ruc = f"17999999{d}0001"
        dia_esperado = 8 + 2 * (d if d else 10)
        assert fecha_vencimiento_mensual(ruc, "2026-09").day == dia_esperado


def test_periodo_diciembre_vence_en_enero_del_anio_siguiente():
    assert fecha_vencimiento_mensual("1799999910001", "2026-12") == date(2027, 1, 10)


def test_noveno_digito():
    assert noveno_digito("1799999950001") == 5


@pytest.mark.parametrize("ruc, ok", [
    ("1799999910001", True),
    ("179999991000", False),     # 12 dígitos
    ("1799999910002", False),    # no termina en 001
    ("17999999A0001", False),    # contiene letras
])
def test_ruc_valido(ruc, ok):
    assert ruc_valido(ruc) is ok


@pytest.mark.parametrize("periodo, ok", [("2026-09", True), ("2026-13", False), ("2026-9", False)])
def test_periodo_valido(periodo, ok):
    assert periodo_valido(periodo) is ok


def test_periodo_anterior():
    assert periodo_anterior(date(2026, 10, 10)) == "2026-09"
    assert periodo_anterior(date(2026, 1, 5)) == "2025-12"
