"""Фоновый опрос Hikvision-устройств.

Раз в N секунд обходит онлайн-устройства, запрашивает события прохода,
делает upsert в attendance_events и шлёт в WebSocket. Чтобы не плодить
дополнительный контейнер Celery worker, запускается прямо из FastAPI startup.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import AttendanceEvent, Device, Employee
from app.services.hikvision import HikvisionService
from app.services.ws import manager

log = logging.getLogger("poller")

POLL_INTERVAL_SECONDS = 30
TIME_SYNC_INTERVAL_SECONDS = 3600  # каждые час подстраиваем время устройств


async def poll_once() -> int:
    """Один цикл: возвращает количество сохранённых событий."""
    saved = 0
    with SessionLocal() as db:
        devices = list(db.scalars(select(Device)).all())
        if not devices:
            return 0

        ext_to_emp_id: dict[str, str] = {}
        for emp in db.scalars(select(Employee).where(Employee.external_id.is_not(None))).all():
            ext_to_emp_id[emp.external_id] = str(emp.id)

        until = datetime.now(timezone.utc)
        since = until - timedelta(seconds=POLL_INTERVAL_SECONDS * 2)

        for device in devices:
            try:
                client = HikvisionService.client_for(device)
                events = await client.fetch_events(since, until)
            except Exception as e:
                log.warning("poll device %s failed: %s", device.id, e)
                continue

            for ev in events:
                emp_id = ext_to_emp_id.get(ev.external_user_id)
                # Hikvision-терминалы односторонние: направление берём из device.purpose
                event_type = ev.event_type
                if device.purpose in ("entry", "exit"):
                    event_type = device.purpose
                ae = AttendanceEvent(
                    employee_id=emp_id,
                    device_id=device.id,
                    external_user_id=ev.external_user_id,
                    event_time=ev.event_time,
                    event_type=event_type,
                    success=ev.success,
                    raw_payload=ev.payload,
                )
                db.add(ae)
                db.flush()
                saved += 1
                await manager.broadcast(
                    {
                        "type": "attendance_event",
                        "event": {
                            "id": str(ae.id),
                            "employee_id": str(emp_id) if emp_id else None,
                            "device_id": str(device.id),
                            "device_name": device.name,
                            "external_user_id": ev.external_user_id,
                            "event_time": ev.event_time.isoformat(),
                            "event_type": ev.event_type,
                        },
                    }
                )
        db.commit()
    return saved


async def sync_time_once() -> int:
    """Подстраивает время всех онлайн-устройств. Возвращает число успешно обновлённых."""
    done = 0
    with SessionLocal() as db:
        devices = list(db.scalars(select(Device).where(Device.online.is_(True))).all())
    for device in devices:
        try:
            client = HikvisionService.client_for(device)
            tz_offset = getattr(device, "timezone_offset", 5)
            if await client.set_time(tz_offset):
                done += 1
        except Exception as e:
            log.debug("set_time %s failed: %s", device.id, e)
    return done


async def loop() -> None:
    last_time_sync = 0.0
    while True:
        try:
            n = await poll_once()
            if n:
                log.info("polled %d new events", n)

            now = asyncio.get_event_loop().time()
            if now - last_time_sync >= TIME_SYNC_INTERVAL_SECONDS:
                synced = await sync_time_once()
                if synced:
                    log.info("synced time on %d devices", synced)
                last_time_sync = now
        except Exception:
            log.exception("poll loop iteration failed")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
