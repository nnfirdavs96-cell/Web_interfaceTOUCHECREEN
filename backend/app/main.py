import asyncio
import logging
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
        from app.db.seed import run as seed_run

        seed_run()

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
