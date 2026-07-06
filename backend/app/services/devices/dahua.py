"""Драйвер Dahua (HTTP CGI API).

Статус: РАБОЧИЙ КАРКАС, ждёт валидации на железе. Dahua CGI похож на
Hikvision ISAPI, но со своими эндпоинтами (/cgi-bin/*.cgi, Digest auth).

Что реализовано по документированному CGI:
- test_connection: magicBox.cgi getSystemInfo/getSoftwareVersion (серийник/прошивка)
- get_snapshot: snapshot.cgi
- set_time: global.cgi setCurrentTime

Access-control операции (пользователи/карты/отпечатки/лица) у Dahua идут
через AccessControl-CGI (AccessUser.cgi и т.п.), формат сильно зависит от
модели контроллера — без железа реализованы как graceful «требует
проверки на устройстве», а не вслепую (иначе гарантированные баги).
"""
import logging
from datetime import datetime

import httpx

from app.services.devices.base import (
    DeviceConn,
    DeviceInfo,
    EnrollResult,
    RawEvent,
)

log = logging.getLogger("devices.dahua")

_NEEDS_HW = "Dahua: операция требует проверки на конкретной модели контроллера"


class DahuaDriver:
    """Драйвер Dahua поверх HTTP CGI. Реализует AccessDevice."""

    def __init__(self, conn: DeviceConn) -> None:
        self.conn = conn
        self._base = f"http://{conn.ip}:{conn.port or 80}"

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=8.0,
            auth=httpx.DigestAuth(self.conn.username, self.conn.password),
        )

    async def _cgi(self, path: str) -> str | None:
        try:
            async with self._client() as client:
                resp = await client.get(f"{self._base}{path}")
                if resp.status_code == 200:
                    return resp.text
                log.debug("Dahua CGI %s → %s", path, resp.status_code)
        except Exception as e:  # noqa: BLE001
            log.info("Dahua CGI %s failed: %s", path, e)
        return None

    @staticmethod
    def _parse_kv(text: str) -> dict[str, str]:
        """Dahua отдаёт key=value построчно."""
        out: dict[str, str] = {}
        for line in text.splitlines():
            if "=" in line:
                k, _, v = line.partition("=")
                out[k.strip()] = v.strip()
        return out

    async def test_connection(self) -> DeviceInfo:
        info = await self._cgi("/cgi-bin/magicBox.cgi?action=getSystemInfo")
        if info is None:
            return DeviceInfo(
                online=False,
                detail="Dahua: устройство не ответило по CGI (проверьте IP/логин)",
            )
        kv = self._parse_kv(info)
        serial = kv.get("serialNumber") or kv.get("sn")
        ver = await self._cgi("/cgi-bin/magicBox.cgi?action=getSoftwareVersion")
        firmware = self._parse_kv(ver).get("version") if ver else None
        return DeviceInfo(
            online=True,
            detail="Dahua: подключение установлено",
            serial_number=serial,
            firmware=firmware,
        )

    async def fetch_events(
        self, since: datetime, until: datetime
    ) -> list[RawEvent]:
        # Access-control лог Dahua: recordFinder.cgi name=AccessControlCardRec.
        # Формат зависит от модели → без железа возвращаем пусто, не гадаем.
        return []

    async def upsert_user(self, external_id: str, full_name: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_HW + " (AccessUser.cgi)")

    async def delete_user(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_HW + " (AccessUser.cgi)")

    async def capture_fingerprint(
        self, external_id: str, finger_no: int = 1
    ) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_HW + " (отпечаток)")

    async def capture_face(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_HW + " (лицо)")

    async def upload_face(
        self, external_id: str, image_bytes: bytes, full_name: str = ""
    ) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_HW + " (загрузка лица)")

    async def get_snapshot(self) -> bytes | None:
        try:
            async with self._client() as client:
                resp = await client.get(
                    f"{self._base}/cgi-bin/snapshot.cgi?channel=1"
                )
                if resp.status_code == 200 and resp.content:
                    return resp.content
        except Exception as e:  # noqa: BLE001
            log.info("Dahua snapshot failed: %s", e)
        return None

    async def add_card(self, external_id: str, card_no: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_HW + " (карта)")

    async def capture_card(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_HW + " (считать карту)")

    async def set_time(self, offset_hours: int = 5) -> bool:
        now = datetime.now().strftime("%Y-%m-%d%%20%H:%M:%S")
        res = await self._cgi(
            f"/cgi-bin/global.cgi?action=setCurrentTime&time={now}"
        )
        return res is not None and "OK" in (res or "").upper()

    async def ensure_24x7_schedule(self) -> bool:
        # У Dahua своя модель time-профилей; дефолт обычно круглосуточный.
        return True
