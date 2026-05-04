from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import get_settings
from api.core.database import engine
from api.models import Base
from api.routes import auth, proyectos, capas

settings = get_settings()

app = FastAPI(
    title="Mapas API",
    description="API para gestión de proyectos cartográficos",
    version="1.0.0",
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/api")
app.include_router(proyectos.router, prefix="/api")
app.include_router(capas.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
