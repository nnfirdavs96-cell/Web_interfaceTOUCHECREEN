import asyncio
import logging
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.api.tenant  # noqa: F401 — регистрирует event-листенер тенант-изоляции
from app.api.v1 import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services import attendance as attendance_service
from app.services.poller import loop as poller_loop

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("app")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        debug=settings.DEBUG,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    background_tasks: set[asyncio.Task] = set()

    @app.on_event("startup")
    def _startup() -> None:
        Base.metadata.create_all(bind=engine)
        # Минимальная "миграция" — добавляем новые колонки если их ещё нет.
        # (полноценный Alembic подключим, когда модель станет стабильной)
        from sqlalchemy import text

        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS "
                    "timezone_offset INTEGER NOT NULL DEFAULT 5"
                )
            )
            conn.execute(
                text(
                    "ALTER TABLE devices ADD COLUMN IF NOT EXISTS "
                    "vendor VARCHAR(32) NOT NULL DEFAULT 'hikvision'"
                )
            )
            # Tenant-ready: organization_id как граница тенанта (nullable, без enforcement).
            for _tbl in ("devices", "cameras", "users", "schedules"):
                conn.execute(
                    text(
                        f"ALTER TABLE {_tbl} ADD COLUMN IF NOT EXISTS "
                        "organization_id UUID REFERENCES organizations(id) "
                        "ON DELETE SET NULL"
                    )
                )
                conn.execute(
                    text(
                        f"CREATE INDEX IF NOT EXISTS ix_{_tbl}_organization_id "
                        f"ON {_tbl} (organization_id)"
                    )
                )

        from app.db.seed import run as seed_run

        seed_run()

        if settings.DEMO_SEED:
            from app.db.demo_seed import run as demo_run

            demo_run()

        # фоновый опрос Hikvision устройств
        loop = asyncio.get_event_loop()
        task = loop.create_task(poller_loop())
        background_tasks.add(task)
        task.add_done_callback(background_tasks.discard)

        # фоновый пересчёт табеля раз в 10 минут (за последние 2 дня)
        async def recalc_loop() -> None:
            while True:
                await asyncio.sleep(600)
                try:
                    with SessionLocal() as db:
                        today = datetime.now(timezone.utc).date()
                        attendance_service.recalculate_range(
                            db, today - timedelta(days=1), today
                        )
                except Exception:
                    log.exception("recalc loop failed")

        rtask = loop.create_task(recalc_loop())
        background_tasks.add(rtask)
        rtask.add_done_callback(background_tasks.discard)

        log.info("App started; background pollers running")

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
