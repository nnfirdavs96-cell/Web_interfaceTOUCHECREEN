"""Device Abstraction Layer (DAL) — единый интерфейс СКУД-устройства.

Не зависит от вендора. Реализации-драйверы:
- MockClient       — для разработки без железа
- IsapiClient      — Hikvision ISAPI (V4.48)
- ZKTecoDriver     — ZKTeco (ZKBio / PUSH SDK)  [в разработке]

Драйвер выбирается по полю Device.vendor через DeviceService.driver_for().
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass
class DeviceConn:
    ip: str
    port: int
    username: str
    password: str


@dataclass
class DeviceInfo:
    online: bool
    detail: str
    serial_number: str | None = None
    firmware: str | None = None


@dataclass
class RawEvent:
    external_user_id: str
    event_time: datetime
    event_type: str  # "entry" | "exit" | "unknown"
    success: bool
    payload: dict


@dataclass
class EnrollResult:
    success: bool
    detail: str
    value_ref: str | None = None  # ID шаблона или маскированный номер


class AccessDevice(Protocol):
    """Единый протокол для любого СКУД-терминала независимо от вендора."""

    async def test_connection(self) -> DeviceInfo: ...
    async def fetch_events(self, since: datetime, until: datetime) -> list[RawEvent]: ...
    async def upsert_user(self, external_id: str, full_name: str) -> EnrollResult: ...
    async def delete_user(self, external_id: str) -> EnrollResult: ...
    async def capture_fingerprint(
        self, external_id: str, finger_no: int = 1
    ) -> EnrollResult: ...
    async def capture_face(self, external_id: str) -> EnrollResult: ...
    async def upload_face(
        self, external_id: str, image_bytes: bytes, full_name: str = ""
    ) -> EnrollResult: ...
    async def get_snapshot(self) -> bytes | None: ...
    async def add_card(self, external_id: str, card_no: str) -> EnrollResult: ...
    async def capture_card(self, external_id: str) -> EnrollResult: ...
    async def set_time(self, offset_hours: int = 5) -> bool: ...
    async def ensure_24x7_schedule(self) -> bool: ...


# Обратная совместимость со старым названием протокола.
HikvisionClient = AccessDevice
