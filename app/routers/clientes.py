from datetime import date

import pymysql
from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_conn, transaction
from ..schemas import Cliente, ClienteConVencidas, ClienteCreado, ClienteIn, ResumenCliente
from ..vencimientos import fecha_vencimiento_mensual, periodo_anterior

router = APIRouter(prefix="/api/clientes", tags=["clientes"])


@router.get("", response_model=list[Cliente])
def listar_clientes(conn=Depends(get_conn)):
    with conn.cursor() as cur:
        cur.execute("SELECT id, ruc, razon_social, email FROM clientes ORDER BY razon_social")
        return cur.fetchall()


@router.post("", response_model=ClienteCreado, status_code=status.HTTP_201_CREATED)
def crear_cliente(datos: ClienteIn, conn=Depends(get_conn)):
    """Crea el cliente y sus obligaciones del último período cerrado
    en UNA transacción: o se guarda todo, o no se guarda nada."""
    periodo = periodo_anterior(date.today())
    vence = fecha_vencimiento_mensual(datos.ruc, periodo)
    try:
        with transaction(conn) as cur:
            cur.execute(
                "INSERT INTO clientes (ruc, razon_social, email) VALUES (%s, %s, %s)",
                (datos.ruc, datos.razon_social, datos.email),
            )
            cliente_id = cur.lastrowid
            # INSERT ... SELECT: una obligación por cada tipo existente.
            cur.execute(
                """
                INSERT INTO obligaciones (cliente_id, tipo_id, periodo, fecha_vencimiento)
                SELECT %s, t.id, %s, %s FROM tipos_obligacion t
                """,
                (cliente_id, periodo, vence),
            )
            generadas = cur.rowcount
    except pymysql.err.IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un cliente con ese RUC")
    return {"id": cliente_id, **datos.model_dump(), "obligaciones_generadas": generadas}


@router.get("/resumen", response_model=list[ResumenCliente])
def resumen_por_cliente(conn=Depends(get_conn)):
    """LEFT JOIN + GROUP BY: conteo de obligaciones por estado para cada cliente
    (incluye clientes sin obligaciones)."""
    sql = """
        SELECT c.id AS cliente_id, c.ruc, c.razon_social,
               COUNT(o.id)                                                         AS total,
               COALESCE(SUM(o.estado = 'presentada'), 0)                           AS presentadas,
               COALESCE(SUM(o.estado = 'pendiente' AND o.fecha_vencimiento >= CURDATE()), 0) AS por_vencer,
               COALESCE(SUM(o.estado = 'pendiente' AND o.fecha_vencimiento <  CURDATE()), 0) AS vencidas
        FROM clientes c
        LEFT JOIN obligaciones o ON o.cliente_id = c.id
        GROUP BY c.id, c.ruc, c.razon_social
        ORDER BY vencidas DESC, por_vencer DESC, c.razon_social
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        filas = cur.fetchall()
    # SUM devuelve DECIMAL en MySQL; lo pasamos a int para el JSON.
    return [{**f, **{k: int(f[k]) for k in ("total", "presentadas", "por_vencer", "vencidas")}}
            for f in filas]


@router.get("/con-vencidas", response_model=list[ClienteConVencidas])
def clientes_con_vencidas(conn=Depends(get_conn)):
    """Subconsulta correlacionada (EXISTS) para filtrar clientes con al menos una
    obligación vencida, y subconsultas escalares para el detalle."""
    sql = """
        SELECT c.id AS cliente_id, c.ruc, c.razon_social,
               (SELECT COUNT(*) FROM obligaciones o2
                 WHERE o2.cliente_id = c.id AND o2.estado = 'pendiente'
                   AND o2.fecha_vencimiento < CURDATE())            AS vencidas,
               (SELECT MIN(o3.fecha_vencimiento) FROM obligaciones o3
                 WHERE o3.cliente_id = c.id AND o3.estado = 'pendiente'
                   AND o3.fecha_vencimiento < CURDATE())            AS vencida_desde
        FROM clientes c
        WHERE EXISTS (
            SELECT 1 FROM obligaciones o
            WHERE o.cliente_id = c.id
              AND o.estado = 'pendiente'
              AND o.fecha_vencimiento < CURDATE()
        )
        ORDER BY vencida_desde, c.razon_social
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()
