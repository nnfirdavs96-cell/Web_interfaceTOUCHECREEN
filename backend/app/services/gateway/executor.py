"""Исполнитель RPC на стороне Edge Gateway (агента).

Принимает декодированный вызов (vendor, conn, method, kwargs), поднимает
локальный драйвер и выполняет метод против устройства в LAN. Использует те
же драйверы, что и облако, — единый код, единое поведение.

Не зависит от FastAPI/БД: conn приходит уже с расшифрованным паролем.
"""
from app.services.devices.base import AccessDevice, DeviceConn
from app.services.devices.dahua import DahuaDriver
from app.services.devices.hikvision import IsapiClient
from app.services.devices.mock import MockClient
from app.services.devices.suprema import SupremaDriver
from app.services.devices.zkteco import ZKTecoDriver

# Методы AccessDevice, разрешённые к удалённому вызову.
ALLOWED_METHODS = {
    "test_connection",
    "fetch_events",
    "upsert_user",
    "delete_user",
    "capture_fingerprint",
    "capture_face",
    "upload_face",
    "get_snapshot",
    "add_card",
    "capture_card",
    "set_time",
    "ensure_24x7_schedule",
}


def driver_for(vendor: str, conn: DeviceConn, *, mock: bool = False) -> AccessDevice:
    """Локальная фабрика драйвера (без БД/decrypt)."""
    if mock:
        return MockClient(conn)
    v = (vendor or "hikvision").lower()
    if v == "zkteco":
        return ZKTecoDriver(conn)
    if v == "dahua":
        return DahuaDriver(conn)
    if v == "suprema":
        return SupremaDriver(conn)
    return IsapiClient(conn)


async def execute(
    vendor: str, conn: DeviceConn, method: str, kwargs: dict, *, mock: bool = False
):
    """Выполняет один RPC-вызов и возвращает результат метода."""
    if method not in ALLOWED_METHODS:
        raise ValueError(f"method not allowed: {method}")
    driver = driver_for(vendor, conn, mock=mock)
    fn = getattr(driver, method)
    return await fn(**kwargs)
