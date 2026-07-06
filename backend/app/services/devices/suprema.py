"""Драйвер Suprema (BioStar 2 API).

Статус: КАРКАС. В отличие от Hikvision/Dahua/ZKTeco, устройства Suprema
управляются НЕ напрямую, а через сервер BioStar 2 (REST API поверх HTTPS).
То есть ip/port у такого «устройства» — это адрес BioStar 2 сервера, а не
самого терминала.

Реализует протокол AccessDevice с понятными сообщениями. Полная
реализация требует развёрнутого BioStar 2 (логин → bs-session-id →
/api/users, /api/events, /api/devices). Дописывается при появлении
доступа к серверу BioStar 2.
"""
import logging
from datetime import datetime

from app.services.devices.base import (
    DeviceConn,
    DeviceInfo,
    EnrollResult,
    RawEvent,
)

log = logging.getLogger("devices.suprema")

_NEEDS_BIOSTAR = (
    "Suprema: требуется сервер BioStar 2 (REST API). Драйвер в разработке."
)


class SupremaDriver:
    """Каркас драйвера Suprema (через BioStar 2). Реализует AccessDevice."""

    def __init__(self, conn: DeviceConn) -> None:
        self.conn = conn

    async def test_connection(self) -> DeviceInfo:
        # TODO: POST {server}/api/login → заголовок bs-session-id.
        return DeviceInfo(
            online=False,
            detail=(
                "Suprema: подключение через BioStar 2 не настроено. "
                "Укажите адрес BioStar 2 сервера и учётные данные."
            ),
        )

    async def fetch_events(
        self, since: datetime, until: datetime
    ) -> list[RawEvent]:
        return []

    async def upsert_user(self, external_id: str, full_name: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_BIOSTAR)

    async def delete_user(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_BIOSTAR)

    async def capture_fingerprint(
        self, external_id: str, finger_no: int = 1
    ) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_BIOSTAR)

    async def capture_face(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_BIOSTAR)

    async def upload_face(
        self, external_id: str, image_bytes: bytes, full_name: str = ""
    ) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_BIOSTAR)

    async def get_snapshot(self) -> bytes | None:
        return None

    async def add_card(self, external_id: str, card_no: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_BIOSTAR)

    async def capture_card(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NEEDS_BIOSTAR)

    async def set_time(self, offset_hours: int = 5) -> bool:
        return False

    async def ensure_24x7_schedule(self) -> bool:
        return True
