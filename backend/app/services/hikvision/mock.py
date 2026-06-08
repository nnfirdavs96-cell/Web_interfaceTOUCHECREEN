"""Mock-клиент Hikvision: имитирует онлайн-устройство для разработки без железа."""
import asyncio
import hashlib
import random
from datetime import datetime, timedelta, timezone

from app.services.hikvision.base import DeviceConn, DeviceInfo, EnrollResult, RawEvent


class MockClient:
    def __init__(self, conn: DeviceConn):
        self.conn = conn

    async def test_connection(self) -> DeviceInfo:
        await asyncio.sleep(0.2)
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

    async def upsert_user(self, external_id: str, full_name: str) -> EnrollResult:
        await asyncio.sleep(0.05)
        return EnrollResult(success=True, detail=f"mock: user {external_id} synced", value_ref=external_id)

    async def delete_user(self, external_id: str) -> EnrollResult:
        await asyncio.sleep(0.05)
        return EnrollResult(success=True, detail=f"mock: user {external_id} deleted")

    async def capture_fingerprint(self, external_id: str, finger_no: int = 1) -> EnrollResult:
        await asyncio.sleep(0.1)
        return EnrollResult(
            success=True,
            detail=f"mock: fingerprint #{finger_no} enrolled for {external_id}",
            value_ref=f"FP-{external_id}-{finger_no}",
        )

    async def get_snapshot(self) -> bytes | None:
        # 1x1 JPEG-заглушка
        return bytes.fromhex(
            "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707"
            "07090908ffd9"
        )

    async def capture_face(self, external_id: str) -> EnrollResult:
        await asyncio.sleep(0.1)
        return EnrollResult(
            success=True,
            detail=f"mock: face captured via device camera for {external_id}",
            value_ref=f"FACE-{external_id}",
        )

    async def upload_face(
        self, external_id: str, image_bytes: bytes, full_name: str = ""
    ) -> EnrollResult:
        await asyncio.sleep(0.1)
        return EnrollResult(
            success=True,
            detail=f"mock: face uploaded for {external_id} ({len(image_bytes)} bytes)",
            value_ref=f"FACE-{external_id}",
        )

    async def add_card(self, external_id: str, card_no: str) -> EnrollResult:
        await asyncio.sleep(0.05)
        return EnrollResult(
            success=True,
            detail=f"mock: card {card_no} linked to {external_id}",
            value_ref=card_no[-4:].rjust(len(card_no), "*"),
        )

    async def capture_card(self, external_id: str) -> EnrollResult:
        await asyncio.sleep(0.1)
        return EnrollResult(
            success=True,
            detail=f"mock: card captured for {external_id}",
            value_ref="****1234",
        )

    async def set_time(self, offset_hours: int = 5) -> bool:
        await asyncio.sleep(0.05)
        return True

    async def ensure_24x7_schedule(self) -> bool:
        await asyncio.sleep(0.05)
        return True
