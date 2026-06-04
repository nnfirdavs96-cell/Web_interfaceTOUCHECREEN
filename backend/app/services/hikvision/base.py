"""Абстракция над Hikvision-устройством.

Реализации: MockClient (для разработки) и IsapiClient (реальный ISAPI).
В этап 3 используется только Mock; ISAPI наполнится при подключении физического устройства.
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


class HikvisionClient(Protocol):
    async def test_connection(self) -> DeviceInfo: ...
    async def fetch_events(self, since: datetime, until: datetime) -> list[RawEvent]: ...
    async def upsert_user(self, external_id: str, full_name: str) -> None: ...
    async def delete_user(self, external_id: str) -> None: ...
