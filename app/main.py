from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routers import clientes, obligaciones

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"

app = FastAPI(
    title="Vencimientos SRI",
    description="Seguimiento de obligaciones tributarias mensuales de clientes (Ecuador).",
    version="1.0.0",
)

app.include_router(clientes.router)
app.include_router(obligaciones.router)


@app.get("/api/health", tags=["sistema"])
def health():
    return {"status": "ok"}


app.mount("/static", StaticFiles(directory=FRONTEND), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(FRONTEND / "index.html")
