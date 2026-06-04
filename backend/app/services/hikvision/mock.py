"""Mock-клиент Hikvision: имитирует онлайн-устройство для разработки без железа.

Стабильно «онлайн», возвращает фейковый serial/firmware, генерирует случайные события.
"""
import asyncio
import hashlib
import random
from datetime import datetime, timedelta, timezone

from app.services.hikvision.base import DeviceConn, DeviceInfo, RawEvent


class MockClient:
    def __init__(self, conn: DeviceConn):
        self.conn = conn

    async def test_connection(self) -> DeviceInfo:
        await asyncio.sleep(0.2)  # имитируем сетевой round-trip
        h = hashlib.md5(self.conn.ip.encode()).hexdigest()[:10].upper()
        return DeviceInfo(
            online=True,
            detail=f"Mock device reachable at {self.conn.ip}:{self.conn.port}",
            serial_number=f"MOCK-{h}",
            firmware="V1.0.0_mock",
        )

    async def fetch_events(self, since: datetime, until: datetime) -> list[RawEvent]:
        await asyncio.sleep(0.1)
        events: list[RawEvent] = []
        span = (until - since).total_seconds()
        if span <= 0:
            return events
        # 0–3 случайных события за период
        for _ in range(random.randint(0, 3)):
            offset = random.random() * span
            t = since + timedelta(seconds=offset)
            events.append(
                RawEvent(
                    external_user_id=str(random.randint(1, 50)),
                    event_time=t.astimezone(timezone.utc),
                    event_type=random.choice(["entry", "exit"]),
                    success=True,
                    payload={"mock": True, "ip": self.conn.ip},
                )
            )
        return events

    async def upsert_user(self, external_id: str, full_name: str) -> None:
        await asyncio.sleep(0.05)

    async def delete_user(self, external_id: str) -> None:
        await asyncio.sleep(0.05)
