"""RemoteDriver — драйвер, маршрутизирующий вызовы через Edge Gateway.

Реализует AccessDevice, но вместо прямого обращения к устройству отправляет
RPC в туннель к агенту в LAN клиента. Если gateway офлайн — методы
деградируют мягко (offline / EnrollResult.success=False), а не падают.
"""
import logging
from datetime import datetime

from app.services.devices.base import (
    DeviceConn,
    DeviceInfo,
    EnrollResult,
    RawEvent,
)
from app.services.gateway.registry import GatewayRegistry

log = logging.getLogger("gateway.remote")


class RemoteDriver:
    def __init__(
        self,
        registry: GatewayRegistry,
        gateway_id: str,
        vendor: str,
        conn: DeviceConn,
    ) -> None:
        self._registry = registry
        self._gid = gateway_id
        self._vendor = vendor
        self._conn = conn

    async def _call(self, method: str, **kwargs):
        conn = self._registry.get(self._gid)
        if conn is None:
            raise ConnectionError("gateway offline")
        return await conn.call(method, self._vendor, self._conn, kwargs)

    async def test_connection(self) -> DeviceInfo:
        try:
            return await self._call("test_connection")
        except Exception as e:  # noqa: BLE001
            return DeviceInfo(online=False, detail=f"Шлюз недоступен: {e}")

    async def fetch_events(
        self, since: datetime, until: datetime
    ) -> list[RawEvent]:
        try:
            return await self._call("fetch_events", since=since, until=until)
        except Exception as e:  # noqa: BLE001
            log.info("gateway fetch_events failed: %s", e)
            return []

    async def _enroll(self, method: str, **kwargs) -> EnrollResult:
        try:
            return await self._call(method, **kwargs)
        except Exception as e:  # noqa: BLE001
            return EnrollResult(success=False, detail=f"Шлюз недоступен: {e}")

    async def upsert_user(self, external_id: str, full_name: str) -> EnrollResult:
        return await self._enroll("upsert_user", external_id=external_id, full_name=full_name)

    async def delete_user(self, external_id: str) -> EnrollResult:
        return await self._enroll("delete_user", external_id=external_id)

    async def capture_fingerprint(
        self, external_id: str, finger_no: int = 1
    ) -> EnrollResult:
        return await self._enroll(
            "capture_fingerprint", external_id=external_id, finger_no=finger_no
        )

    async def capture_face(self, external_id: str) -> EnrollResult:
        return await self._enroll("capture_face", external_id=external_id)

    async def upload_face(
        self, external_id: str, image_bytes: bytes, full_name: str = ""
    ) -> EnrollResult:
        return await self._enroll(
            "upload_face",
            external_id=external_id,
            image_bytes=image_bytes,
            full_name=full_name,
        )

    async def get_snapshot(self) -> bytes | None:
        try:
            return await self._call("get_snapshot")
        except Exception as e:  # noqa: BLE001
            log.info("gateway snapshot failed: %s", e)
            return None

    async def add_card(self, external_id: str, card_no: str) -> EnrollResult:
        return await self._enroll("add_card", external_id=external_id, card_no=card_no)

    async def capture_card(self, external_id: str) -> EnrollResult:
        return await self._enroll("capture_card", external_id=external_id)

    async def set_time(self, offset_hours: int = 5) -> bool:
        try:
            return await self._call("set_time", offset_hours=offset_hours)
        except Exception:  # noqa: BLE001
            return False

    async def ensure_24x7_schedule(self) -> bool:
        try:
            return await self._call("ensure_24x7_schedule")
        except Exception:  # noqa: BLE001
            return False
