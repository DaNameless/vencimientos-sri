"""Exporta el contrato OpenAPI de la API a frontend/openapi.json.

El frontend genera sus tipos TypeScript a partir de este archivo
(`npm run gen:api`), así que el contrato entre backend y frontend
tiene una única fuente de verdad: los modelos Pydantic del backend.

    python scripts/exportar_openapi.py
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from app.main import app  # noqa: E402

destino = RAIZ / "frontend" / "openapi.json"
destino.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Contrato escrito en {destino.relative_to(RAIZ)}")
