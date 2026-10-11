"""Conexión a MySQL con PyMySQL y un helper de transacciones.

Se usa SQL explícito (sin ORM) a propósito: el objetivo del proyecto es
practicar modelado relacional y consultas SQL.
"""
import os
from contextlib import contextmanager

import pymysql
from pymysql.cursors import DictCursor


def _config() -> dict:
    return {
        "host": os.getenv("DB_HOST", "127.0.0.1"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", "app"),
        "password": os.getenv("DB_PASSWORD", "app"),
        "database": os.getenv("DB_NAME", "vencimientos"),
        "charset": "utf8mb4",
        "cursorclass": DictCursor,
        "autocommit": False,
    }


def connect():
    return pymysql.connect(**_config())


def get_conn():
    """Dependencia de FastAPI: abre una conexión por request y la cierra al final."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def transaction(conn):
    """Ejecuta un bloque como una sola transacción: COMMIT si todo sale bien,
    ROLLBACK si cualquier sentencia (o validación) lanza una excepción."""
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
