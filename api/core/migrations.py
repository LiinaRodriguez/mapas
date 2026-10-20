from sqlalchemy import text
from sqlalchemy.engine import Engine

# create_all() does not alter existing tables, so new columns are added here.
STATEMENTS = [
    "ALTER TABLE capas ADD COLUMN IF NOT EXISTS estilo JSONB",
    "ALTER TABLE capas ADD COLUMN IF NOT EXISTS bounds JSONB",
    "ALTER TABLE proyectos_capas ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE proyectos_capas ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE proyectos_capas ADD COLUMN IF NOT EXISTS opacidad DOUBLE PRECISION NOT NULL DEFAULT 1",
]


def run_migrations(engine: Engine) -> None:
    with engine.begin() as conn:
        for stmt in STATEMENTS:
            conn.execute(text(stmt))
