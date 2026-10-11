"""Pruebas de integración contra una base MySQL real.

Usa las variables DB_HOST, DB_USER, DB_PASSWORD, DB_NAME (ver .env.example).
Si la base no está disponible, las pruebas se omiten.
"""
from pathlib import Path

import pymysql
import pytest
from fastapi.testclient import TestClient

from app.db import connect
from app.main import app

DB_DIR = Path(__file__).resolve().parent.parent / "db"


def _ejecutar_script(conn, ruta: Path):
    # Quita comentarios de línea y separa por ';' (los scripts no tienen ';' dentro de textos).
    lineas = [l for l in ruta.read_text(encoding="utf-8").splitlines() if not l.strip().startswith("--")]
    sentencias = [s.strip() for s in "\n".join(lineas).split(";") if s.strip()]
    with conn.cursor() as cur:
        for s in sentencias:
            cur.execute(s)
    conn.commit()


@pytest.fixture()
def client():
    try:
        conn = connect()
    except pymysql.err.OperationalError:
        pytest.skip("MySQL no disponible")
    _ejecutar_script(conn, DB_DIR / "01_schema.sql")
    _ejecutar_script(conn, DB_DIR / "02_seed.sql")
    conn.close()
    return TestClient(app)


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_crear_cliente_genera_obligaciones_en_la_misma_transaccion(client):
    r = client.post("/api/clientes", json={"ruc": "1799999920001", "razon_social": "Cliente Prueba S.A."})
    assert r.status_code == 201
    assert r.json()["obligaciones_generadas"] == 2  # IVA + RET

    cliente_id = r.json()["id"]
    obligaciones = client.get(f"/api/obligaciones?cliente_id={cliente_id}").json()
    assert {o["tipo"] for o in obligaciones} == {"IVA", "RET"}
    assert all(o["fecha_vencimiento"].endswith("-12") for o in obligaciones)  # noveno dígito 2 → día 12


def test_ruc_duplicado_devuelve_409(client):
    datos = {"ruc": "1799999910001", "razon_social": "Duplicado S.A."}
    assert client.post("/api/clientes", json=datos).status_code == 409


def test_ruc_invalido_devuelve_422(client):
    assert client.post("/api/clientes", json={"ruc": "123", "razon_social": "Malo"}).status_code == 422


def test_generar_periodo_es_idempotente(client):
    primera = client.post("/api/obligaciones/generar", json={"periodo": "2020-01"}).json()
    segunda = client.post("/api/obligaciones/generar", json={"periodo": "2020-01"}).json()
    assert primera["creadas"] == 10   # 5 clientes x 2 tipos
    assert segunda["creadas"] == 0


def test_resumen_y_clientes_con_vencidas(client):
    client.post("/api/obligaciones/generar", json={"periodo": "2020-01"})  # todas vencidas
    client.post("/api/obligaciones/generar", json={"periodo": "2099-01"})  # todas por vencer

    resumen = client.get("/api/clientes/resumen").json()
    assert len(resumen) == 5
    assert all(f["vencidas"] == 2 and f["por_vencer"] == 2 for f in resumen)

    vencidas = client.get("/api/obligaciones?estado=vencida").json()
    assert len(vencidas) == 10 and all(o["dias_restantes"] < 0 for o in vencidas)

    con_vencidas = client.get("/api/clientes/con-vencidas").json()
    assert len(con_vencidas) == 5
    assert con_vencidas[0]["vencida_desde"].startswith("2020-02")


def test_marcar_presentada_y_no_dos_veces(client):
    client.post("/api/obligaciones/generar", json={"periodo": "2020-01"})
    oblig_id = client.get("/api/obligaciones").json()[0]["id"]

    r = client.post(f"/api/obligaciones/{oblig_id}/presentar")
    assert r.status_code == 200 and r.json()["estado"] == "presentada"
    assert client.post(f"/api/obligaciones/{oblig_id}/presentar").status_code == 409

    # La bitácora se escribió en la misma transacción
    conn = connect()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM bitacora WHERE obligacion_id = %s", (oblig_id,))
        assert cur.fetchone()["n"] == 1
    conn.close()


def test_obligacion_inexistente_devuelve_404(client):
    assert client.post("/api/obligaciones/99999/presentar").status_code == 404
