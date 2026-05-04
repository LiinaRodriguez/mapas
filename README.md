# Mapas — Monorepo de Gestión Cartográfica

Aplicación web full-stack para la gestión de proyectos cartográficos. Permite la ingesta de archivos SHP (vía ZIP) y KML, transformándolos en GeoJSON para su almacenamiento persistente, organización visual y exportación final a PDF.

## Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Backend | FastAPI + SQLAlchemy + Geopandas |
| Frontend | React + Vite + TypeScript + MapLibre GL JS |
| Estado | Zustand |
| PDF | jsPDF |
| Base de datos | Neon (PostgreSQL estándar, sin PostGIS) |
| Autenticación | JWT (python-jose + bcrypt) |

## Estructura

```
mapas/
├── api/          # Backend FastAPI
└── web-client/   # Frontend React + Vite + TS
```

## Inicio Rápido

### Backend

```bash
cd api
cp .env.example .env
# Editar .env con tu DATABASE_URL de Neon y JWT_SECRET

pip install -r requirements.txt
uvicorn api.main:app --reload
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
3. **Subir archivos** `.zip` (Shapefile) o `.kml`
4. **Gestionar capas**: renombrar, toggle visibilidad, reordenar
5. **Exportar a PDF** con mapa, leyenda, escala, datos del usuario y metadatos
