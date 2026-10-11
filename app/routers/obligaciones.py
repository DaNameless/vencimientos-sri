from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..db import get_conn, transaction
from ..schemas import GenerarPeriodoIn, GenerarPeriodoOut, Obligacion
from ..vencimientos import fecha_vencimiento_mensual

router = APIRouter(prefix="/api/obligaciones", tags=["obligaciones"])

# El estado "vencida" no se guarda en la tabla: se deriva de estado + fecha.
ESTADO_EFECTIVO = """
    CASE
        WHEN o.estado = 'presentada'         THEN 'presentada'
        WHEN o.fecha_vencimiento < CURDATE() THEN 'vencida'
        ELSE 'pendiente'
    END
"""

# Fragmentos SQL fijos (nunca se concatena texto del usuario).
FILTROS_ESTADO = {
    "pendiente":  "o.estado = 'pendiente' AND o.fecha_vencimiento >= CURDATE()",
    "vencida":    "o.estado = 'pendiente' AND o.fecha_vencimiento <  CURDATE()",
    "presentada": "o.estado = 'presentada'",
}


def consultar_obligaciones(conn, estado=None, cliente_id=None, obligacion_id=None) -> list[dict]:
    """JOIN de tres tablas con filtros opcionales; los valores siempre van parametrizados."""
    condiciones, params = [], []
    if estado:
        condiciones.append(FILTROS_ESTADO[estado])
    if cliente_id:
        condiciones.append("o.cliente_id = %s")
        params.append(cliente_id)
    if obligacion_id:
        condiciones.append("o.id = %s")
        params.append(obligacion_id)
    where = ("WHERE " + " AND ".join(condiciones)) if condiciones else ""

    sql = f"""
        SELECT o.id, o.cliente_id, c.razon_social, c.ruc,
               t.codigo AS tipo, t.nombre AS tipo_nombre,
               o.periodo, o.fecha_vencimiento,
               {ESTADO_EFECTIVO} AS estado,
               DATEDIFF(o.fecha_vencimiento, CURDATE()) AS dias_restantes
        FROM obligaciones o
        JOIN clientes c         ON c.id = o.cliente_id
        JOIN tipos_obligacion t ON t.id = o.tipo_id
        {where}
        ORDER BY o.fecha_vencimiento, c.razon_social, t.codigo
    """
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("", response_model=list[Obligacion])
def listar_obligaciones(
    estado: Optional[Literal["pendiente", "vencida", "presentada"]] = None,
    cliente_id: Optional[int] = Query(None, ge=1),
    conn=Depends(get_conn),
):
    return consultar_obligaciones(conn, estado=estado, cliente_id=cliente_id)


@router.post("/{obligacion_id}/presentar", response_model=Obligacion)
def marcar_presentada(obligacion_id: int, conn=Depends(get_conn)):
    """Transacción con bloqueo de fila (SELECT ... FOR UPDATE): evita que dos
    usuarios marquen la misma obligación a la vez y garantiza que el cambio de
    estado y el registro en bitácora se guarden juntos (o ninguno)."""
    with transaction(conn) as cur:
        cur.execute("SELECT id, estado FROM obligaciones WHERE id = %s FOR UPDATE", (obligacion_id,))
        fila = cur.fetchone()
        if fila is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Obligación no encontrada")
        if fila["estado"] == "presentada":
            raise HTTPException(status.HTTP_409_CONFLICT, "La obligación ya fue presentada")

        cur.execute(
            "UPDATE obligaciones SET estado = 'presentada', presentada_en = NOW() WHERE id = %s",
            (obligacion_id,),
        )
        cur.execute(
            "INSERT INTO bitacora (obligacion_id, accion, detalle) VALUES (%s, 'presentada', %s)",
            (obligacion_id, "Marcada como presentada desde la API"),
        )

    return consultar_obligaciones(conn, obligacion_id=obligacion_id)[0]


@router.post("/generar", response_model=GenerarPeriodoOut, status_code=status.HTTP_201_CREATED)
def generar_periodo(datos: GenerarPeriodoIn, conn=Depends(get_conn)):
    """Genera las obligaciones de un período para TODOS los clientes en una sola
    transacción. INSERT IGNORE + la restricción UNIQUE la hacen idempotente:
    ejecutarla dos veces no duplica nada."""
    with transaction(conn) as cur:
        cur.execute("SELECT id, ruc FROM clientes")
        clientes = cur.fetchall()
        cur.execute("SELECT id FROM tipos_obligacion")
        tipos = [t["id"] for t in cur.fetchall()]

        filas = [
            (c["id"], tipo_id, datos.periodo, fecha_vencimiento_mensual(c["ruc"], datos.periodo))
            for c in clientes
            for tipo_id in tipos
        ]
        creadas = 0
        if filas:
            creadas = cur.executemany(
                """INSERT IGNORE INTO obligaciones (cliente_id, tipo_id, periodo, fecha_vencimiento)
                   VALUES (%s, %s, %s, %s)""",
                filas,
            )
    return {"periodo": datos.periodo, "creadas": creadas}
