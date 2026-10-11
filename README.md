# Vencimientos SRI

Aplicación full stack para dar seguimiento a las **obligaciones tributarias mensuales** (IVA y retenciones en la fuente) de una cartera de clientes en Ecuador. Calcula la fecha de vencimiento de cada declaración según el **noveno dígito del RUC**, muestra qué está por vencer o vencido, y permite marcar declaraciones como presentadas.

![Captura](docs/screenshot.png)

**Stack:** Python · FastAPI · MySQL 8 · JavaScript (ES6+) · HTML/CSS · Docker · GitHub Actions

## Funcionalidades

- Resumen por cliente: obligaciones por vencer, vencidas y presentadas.
- Listado de obligaciones con filtro por estado y días restantes.
- Alta de clientes con validación de RUC; al crear un cliente se generan automáticamente sus obligaciones del último mes cerrado.
- Generación de obligaciones de un período para toda la cartera (idempotente: ejecutarla dos veces no duplica registros).
- Marcado de obligaciones como presentadas, con registro en bitácora.
- Documentación interactiva de la API en `/docs` (Swagger, generada por FastAPI).

## Decisiones técnicas

El acceso a datos usa **SQL explícito con PyMySQL** (sin ORM) para trabajar directamente el modelado relacional y las consultas:

| Concepto | Dónde |
|---|---|
| Modelado relacional, claves foráneas, `UNIQUE` | `db/01_schema.sql` |
| Índice compuesto `(estado, fecha_vencimiento)` para la consulta más frecuente | `db/01_schema.sql` |
| `JOIN` de tres tablas y estado derivado con `CASE` | `app/routers/obligaciones.py` → `consultar_obligaciones` |
| `LEFT JOIN` + `GROUP BY` + agregaciones condicionales | `app/routers/clientes.py` → `resumen_por_cliente` |
| Subconsultas correlacionadas (`EXISTS` y escalares) | `app/routers/clientes.py` → `clientes_con_vencidas` |
| `INSERT ... SELECT` | `app/routers/clientes.py` → `crear_cliente` |
| Transacciones con `COMMIT`/`ROLLBACK` | `app/db.py` → `transaction` |
| Bloqueo de fila con `SELECT ... FOR UPDATE` | `app/routers/obligaciones.py` → `marcar_presentada` |
| Idempotencia con `INSERT IGNORE` + restricción única | `app/routers/obligaciones.py` → `generar_periodo` |

Otras decisiones:

- El estado **"vencida" no se almacena**: se calcula a partir de `estado` y `fecha_vencimiento`, así nunca queda desactualizado.
- Todas las consultas van **parametrizadas** (protección contra inyección SQL); los filtros dinámicos se arman solo con fragmentos fijos del código.
- Validación de entrada con **Pydantic** (RUC, período `YYYY-MM`, email); errores claros con códigos HTTP `404`, `409` y `422`.
- Frontend en **JavaScript sin frameworks**: módulos ES, `fetch` con `async/await`, delegación de eventos y escape de HTML para evitar XSS.

## Ejecutar

### Con Docker (recomendado)

```bash
docker compose up --build
```

Abrir <http://localhost:8000>. La base se crea y se llena con datos de ejemplo automáticamente. Para ver obligaciones, usar el botón **Generar obligaciones** con el período que se quiera.

### Sin Docker

Requiere Python 3.11+ y un servidor MySQL 8 con una base `vencimientos` y un usuario `app`/`app` (o ajustar las variables de `.env.example`).

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

mysql -u app -p vencimientos < db/01_schema.sql
mysql -u app -p vencimientos < db/02_seed.sql

uvicorn app.main:app --reload
```

## Pruebas

```bash
pytest -v
```

- `tests/test_vencimientos.py`: reglas de negocio puras (no necesita base de datos).
- `tests/test_api.py`: pruebas de integración contra MySQL real (transacciones, idempotencia, conflictos, agregaciones). Se omiten si no hay base disponible.

Las pruebas corren automáticamente en cada push y Pull Request con **GitHub Actions** (`.github/workflows/ci.yml`), usando un servicio MySQL 8.

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/clientes` | Lista de clientes |
| `POST` | `/api/clientes` | Crea cliente + obligaciones del último mes cerrado |
| `GET` | `/api/clientes/resumen` | Conteo de obligaciones por estado y cliente |
| `GET` | `/api/clientes/con-vencidas` | Clientes con al menos una obligación vencida |
| `GET` | `/api/obligaciones?estado=&cliente_id=` | Obligaciones con filtros |
| `POST` | `/api/obligaciones/generar` | Genera obligaciones de un período para todos los clientes |
| `POST` | `/api/obligaciones/{id}/presentar` | Marca una obligación como presentada |

## Alcance y simplificaciones

La regla de vencimiento usa el calendario general de declaraciones mensuales del SRI (noveno dígito 1 → día 10, 2 → 12, … 9 → 26, 0 → 28 del mes siguiente). **No** contempla el traslado por feriados o fines de semana, ni los calendarios especiales (contribuyentes especiales, Galápagos, prórrogas por resolución). Es un proyecto de práctica: para uso real, verificar siempre el calendario vigente en [sri.gob.ec](https://www.sri.gob.ec).

Los RUC y razones sociales de los datos de ejemplo son ficticios.

## Posibles mejoras

- Ajuste de fechas por feriados y fines de semana.
- Autenticación y usuarios con roles.
- Obligaciones anuales y semestrales (Impuesto a la Renta, IVA semestral).
- Notificaciones por correo antes del vencimiento.
