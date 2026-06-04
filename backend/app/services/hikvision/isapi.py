"""ISAPI-клиент для реальных устройств Hikvision (AcsEvent, UserInfo).

Заглушка — реализуем при подключении физического устройства.
Эндпоинты: /ISAPI/AccessControl/AcsEvent, /ISAPI/AccessControl/UserInfo/Record и т.п.
Авторизация — HTTP Digest.
"""
from datetime import datetime

import httpx
from httpx import DigestAuth

from app.services.hikvision.base import DeviceConn, DeviceInfo, RawEvent


class IsapiClient:
    def __init__(self, conn: DeviceConn, timeout: float = 5.0):
        self.conn = conn
        self.base = f"http://{conn.ip}:{conn.port}"
        self.auth = DigestAuth(conn.username, conn.password)
        self.timeout = timeout

    async def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base, auth=self.auth, timeout=self.timeout)

    async def test_connection(self) -> DeviceInfo:
        try:
            async with await self._client() as c:
                r = await c.get("/ISAPI/System/deviceInfo?format=json")
                if r.status_code != 200:
                    return DeviceInfo(online=False, detail=f"HTTP {r.status_code}")
                data = r.json().get("DeviceInfo", {})
                return DeviceInfo(
                    online=True,
                    detail="OK",
                    serial_number=data.get("serialNumber"),
                    firmware=data.get("firmwareVersion"),
                )
        except Exception as e:
            return DeviceInfo(online=False, detail=str(e))

    async def fetch_events(self, since: datetime, until: datetime) -> list[RawEvent]:
        # TODO: реализовать AcsEvent search при подключении устройства
        return []

    async def upsert_user(self, external_id: str, full_name: str) -> None:
        # TODO: ISAPI UserInfo/Record
        return None

    async def delete_user(self, external_id: str) -> None:
        return None
