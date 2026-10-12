from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from .routers import clientes, obligaciones

# Salida del build de producción del frontend (React + TypeScript): `npm run build`.
DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

app = FastAPI(
    title="Vencimientos SRI",
    description="Seguimiento de obligaciones tributarias mensuales de clientes (Ecuador).",
    version="2.0.0",
)

app.include_router(clientes.router)
app.include_router(obligaciones.router)


@app.get("/api/health", tags=["sistema"])
def health():
    return {"status": "ok"}


if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/", include_in_schema=False)
def index():
    if (DIST / "index.html").is_file():
        return FileResponse(DIST / "index.html")
    return PlainTextResponse(
        "Frontend sin compilar. Ejecuta `npm run build` en frontend/ "
        "o usa `npm run dev` y abre http://localhost:5173.",
        status_code=503,
    )
