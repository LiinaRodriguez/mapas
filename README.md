# Mapas — Monorepo de Gestión Cartográfica

Plataforma web de cartografía interactiva y exportación geoespacial. Permite cargar capas vectoriales (GeoJSON, KML, Shapefile en `.zip`) y raster (GeoTIFF, WMS, WMTS/XYZ), personalizar su simbología, consultar atributos, medir distancias y áreas, y generar mapas en PDF (estándar o georreferenciado) para la gestión territorial y ambiental.

## Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Backend | FastAPI + SQLAlchemy + GeoPandas (pyogrio/GDAL) + PyProj |
| Frontend | React + Vite + TypeScript + MapLibre GL JS (WebGL) + proj4 |
| Estado | Zustand |
| PDF | ReportLab + pypdf en el backend (layout, grilla, leyenda, GeoPDF) |
| Despliegue | Docker Compose + Nginx (reverse proxy) |
| Base de datos | Neon (PostgreSQL estándar, sin PostGIS) |
| Autenticación | JWT (python-jose + bcrypt) |

## Estructura

```
mapas/
├── api/          # Backend FastAPI
└── web-client/   # Frontend React + Vite + TS
```

## Inicio Rápido

### Con Docker Compose

```bash
docker compose up --build
```

La aplicación queda en `http://localhost:8080`. Nginx sirve el frontend y redirige `/api` al backend; Compose levanta además una base PostgreSQL local. Para usar Neon u otra base, defina `DATABASE_URL` (y `JWT_SECRET`) en el entorno antes de `docker compose up`.

### Backend

```bash
cd api
cp .env.example .env
# Editar .env con tu DATABASE_URL de Neon y JWT_SECRET

pip install -r requirements.txt
cd .. && uvicorn api.main:app --reload
```

Las columnas nuevas de la base (`estilo`, `bounds`, `orden`, `visible`, `opacidad`) se agregan solas al iniciar (`api/core/migrations.py`).

Pruebas del backend:

```bash
pip install -r api/requirements-dev.txt
python -m pytest api/tests
```

El backend estará disponible en `http://localhost:8000`.  
Swagger UI: `http://localhost:8000/docs`

### Frontend

```bash
cd web-client
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.  
El proxy de Vite redirige `/api` → `http://localhost:8000`.

## Flujo de Trabajo

1. **Registrarse / Iniciar sesión**
2. **Crear un proyecto**
3. **Subir capas**: `.zip` (Shapefile con `.shp`, `.dbf`, `.shx`, `.prj`), `.kml` o `.geojson`. Se reproyectan a WGS84.
4. **Gestionar capas**: visibilidad, opacidad, orden por arrastre (la primera se dibuja encima), renombrar, descargar (GeoJSON, KML, SHP) y quitar del proyecto.
5. **Simbología**: relleno, borde, grosor, opacidad y estilo por categorías o graduado según un campo.
6. **Consultar**: clic sobre una geometría para ver sus atributos, o tabla de atributos con búsqueda y filtro sobre el mapa.
7. **Herramientas**: zoom por rectángulo, medición de distancias (m/km) y áreas (m²/ha), restablecer vista, mapa base (satélite, OSM, claro) y coordenadas del cursor en WGS84 (decimal/GMS), CTM12 (EPSG:9377) y Bogotá (EPSG:3116).
8. **Raster de sesión**: servicios WMS, WMTS/XYZ y GeoTIFF (EPSG:4326, 3857, 9377 o 3116) cargados en el navegador.
9. **Exportar**: PDF en Carta, A4 o A3, horizontal o vertical, a 150 o 300 DPI, con título, subtítulo, notas, flecha de norte, escala gráfica y numérica, leyenda, grilla (WGS84, CTM12 o Bogotá) y metadatos; opcionalmente georreferenciado (GeoPDF). También GeoTIFF en EPSG:3857.

## API de exportación

`POST /api/exportar/pdf` recibe el `PDFExportPayload` del spec (`title`, `paperSize`, `orientation`, `dpi`, `bbox`, `includeLegend`, `includeGrid`, `layers`) más `subtitle`, `notes`, `author`, `gridCrs`, `georeferenced`, `legend` y `mapImage` (la vista del mapa renderizada por el cliente al tamaño exacto del marco, que informa `GET /api/exportar/marco`).
