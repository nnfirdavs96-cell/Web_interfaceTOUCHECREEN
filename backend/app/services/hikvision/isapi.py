"""ISAPI-клиент для реальных устройств Hikvision (DS-K1T343 и аналоги).

Поддерживает обе формы ответа (JSON и XML) — некоторые модели возвращают XML
даже при `format=json`. Авторизация — HTTP Digest.
"""
import logging
import re
import uuid
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

import httpx
from httpx import DigestAuth

from app.services.hikvision.base import DeviceConn, DeviceInfo, RawEvent

log = logging.getLogger("hikvision.isapi")


def _strip_ns(tag: str) -> str:
    """`{http://www.isapi.org/ver20/XMLSchema}DeviceInfo` → `DeviceInfo`."""
    return re.sub(r"^\{[^}]+\}", "", tag)


def _xml_to_dict(elem: ET.Element) -> dict:
    result: dict = {}
    for child in elem:
        key = _strip_ns(child.tag)
        if len(child) > 0:
            result[key] = _xml_to_dict(child)
        else:
            result[key] = child.text
    return result


def _fmt_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat(timespec="seconds")


# minor-коды событий доступа Hikvision (major=5)
# Полный список в ISAPI Event spec; здесь — типовые успешные проходы для DS-K1T343
SUCCESS_MINORS = {38, 39, 40, 75, 76, 77, 84, 85, 86, 87}


class IsapiClient:
    def __init__(self, conn: DeviceConn, timeout: float = 10.0):
        self.conn = conn
        self.base = f"http://{conn.ip}:{conn.port}"
        self.auth = DigestAuth(conn.username, conn.password)
        self.timeout = timeout

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base, auth=self.auth, timeout=self.timeout)

    @staticmethod
    def _parse(r: httpx.Response) -> dict:
        """Hikvision часто отдаёт XML c Content-Type: application/json — парсим оба формата."""
        text = (r.text or "").lstrip()
        try:
            if text.startswith("<"):
                root = ET.fromstring(text)
                return {_strip_ns(root.tag): _xml_to_dict(root)}
            return r.json()
        except Exception as e:
            log.warning("parse failed: %s; body=%s", e, text[:200])
            return {}

    async def test_connection(self) -> DeviceInfo:
        try:
            async with self._client() as c:
                r = await c.get("/ISAPI/System/deviceInfo?format=json")
                if r.status_code != 200:
                    return DeviceInfo(online=False, detail=f"HTTP {r.status_code}: {r.text[:120]}")
                data = self._parse(r)
                info = data.get("DeviceInfo") or data
                return DeviceInfo(
                    online=True,
                    detail=f"OK · {info.get('model') or info.get('deviceName') or 'Hikvision'}",
                    serial_number=info.get("serialNumber"),
                    firmware=info.get("firmwareVersion"),
                )
        except Exception as e:
            return DeviceInfo(online=False, detail=str(e)[:200])

    async def fetch_events(self, since: datetime, until: datetime) -> list[RawEvent]:
        events: list[RawEvent] = []
        search_id = str(uuid.uuid4())
        position = 0
        max_per_request = 30

        try:
            async with self._client() as c:
                while True:
                    body = {
                        "AcsEventCond": {
                            "searchID": search_id,
                            "searchResultPosition": position,
                            "maxResults": max_per_request,
                            "major": 5,  # access controller events
                            "minor": 0,  # 0 = все minor-коды
                            "startTime": _fmt_iso(since),
                            "endTime": _fmt_iso(until),
                        }
                    }
                    r = await c.post(
                        "/ISAPI/AccessControl/AcsEvent?format=json", json=body
                    )
                    if r.status_code != 200:
                        log.warning("AcsEvent HTTP %s: %s", r.status_code, r.text[:200])
                        break

                    data = self._parse(r)
                    acs = data.get("AcsEvent") or data
                    info_list = acs.get("InfoList") or []
                    if isinstance(info_list, dict):
                        info_list = [info_list]

                    for item in info_list:
                        ext_id = (
                            item.get("employeeNoString")
                            or item.get("employeeNo")
                            or item.get("cardNo")
                        )
                        time_str = item.get("time")
                        if not (ext_id and time_str):
                            continue
                        try:
                            ev_time = datetime.fromisoformat(time_str)
                            if ev_time.tzinfo is None:
                                ev_time = ev_time.replace(tzinfo=timezone.utc)
                            ev_time = ev_time.astimezone(timezone.utc)
                        except (ValueError, TypeError):
                            continue
                        minor = int(item.get("minor") or 0)
                        result_type = item.get("eventResultType")
                        success = (
                            int(result_type) == 1 if result_type is not None else (minor in SUCCESS_MINORS)
                        )
                        events.append(
                            RawEvent(
                                external_user_id=str(ext_id),
                                event_time=ev_time,
                                event_type="entry",  # односторонний терминал; направление берётся из device.purpose
                                success=success,
                                payload=item,
                            )
                        )

                    fetched = len(info_list)
                    total = int(acs.get("totalMatches") or 0)
                    status_str = (acs.get("responseStatusStrg") or "").upper()
                    position += fetched

                    if (
                        fetched == 0
                        or fetched < max_per_request
                        or status_str.startswith("NO MATCH")
                        or (total and position >= total)
                    ):
                        break
        except Exception as e:
            log.warning("fetch_events failed: %s", e)

        return events

    async def upsert_user(self, external_id: str, full_name: str) -> None:
        # TODO: PUT /ISAPI/AccessControl/UserInfo/SetUp?format=json
        # с телом {"UserInfo": [{"employeeNo": external_id, "name": full_name, ...}]}
        return None

    async def delete_user(self, external_id: str) -> None:
        # TODO: PUT /ISAPI/AccessControl/UserInfo/Delete?format=json
        return None
