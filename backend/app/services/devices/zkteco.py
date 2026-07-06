"""Драйвер ZKTeco.

Статус: КАРКАС. Реализует протокол AccessDevice, но операции пока
возвращают понятное сообщение «не реализовано», а не падают —
чтобы UI работал одинаково для всех вендоров.

Планируемый транспорт (уточняется при получении реального устройства):
- pyzk (протокол ZKTeco на порту 4370, TCP/UDP) — для standalone-терминалов
- ZKBioAccess / PUSH SDK (HTTP) — для устройств в экосистеме ZKBio

Портирование логики из HikvisionDriver невозможно напрямую: у ZKTeco
своя модель пользователей (uid/user_id), шаблоны отпечатков в своём
формате, события через attendance-лог. Драйвер будет дописан по факту
подключения железа (как это делалось для Hikvision V4.48).
"""
import logging
from datetime import datetime

from app.services.devices.base import (
    DeviceConn,
    DeviceInfo,
    EnrollResult,
    RawEvent,
)

log = logging.getLogger("devices.zkteco")

_NOT_READY = "Драйвер ZKTeco в разработке — операция пока недоступна"


class ZKTecoDriver:
    """Каркас драйвера ZKTeco. Реализует AccessDevice."""

    def __init__(self, conn: DeviceConn) -> None:
        self.conn = conn

    async def test_connection(self) -> DeviceInfo:
        # TODO: pyzk connect() на порт 4370 или ZKBio ping.
        return DeviceInfo(
            online=False,
            detail=(
                "ZKTeco: драйвер в разработке. Подключение будет реализовано "
                "через pyzk (порт 4370) или ZKBio PUSH SDK."
            ),
        )

    async def fetch_events(
        self, since: datetime, until: datetime
    ) -> list[RawEvent]:
        # TODO: чтение attendance-лога ZKTeco (get_attendance).
        return []

    async def upsert_user(self, external_id: str, full_name: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NOT_READY)

    async def delete_user(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NOT_READY)

    async def capture_fingerprint(
        self, external_id: str, finger_no: int = 1
    ) -> EnrollResult:
        return EnrollResult(success=False, detail=_NOT_READY)

    async def capture_face(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NOT_READY)

    async def upload_face(
        self, external_id: str, image_bytes: bytes, full_name: str = ""
    ) -> EnrollResult:
        return EnrollResult(success=False, detail=_NOT_READY)

    async def get_snapshot(self) -> bytes | None:
        # Большинство терминалов ZKTeco не отдают snapshot по HTTP.
        return None

    async def add_card(self, external_id: str, card_no: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NOT_READY)

    async def capture_card(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NOT_READY)

    async def set_time(self, offset_hours: int = 5) -> bool:
        # TODO: pyzk set_time(datetime).
        return False

    async def ensure_24x7_schedule(self) -> bool:
        # У ZKTeco модель прав доступа иная (time zones / groups).
        return True
