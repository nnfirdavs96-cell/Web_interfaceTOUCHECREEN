"""Device Abstraction Layer — единый мультивендорный доступ к СКУД."""
from app.services.devices.base import (
    AccessDevice,
    DeviceConn,
    DeviceInfo,
    EnrollResult,
    HikvisionClient,
    RawEvent,
)
from app.services.devices.service import DeviceService, HikvisionService

# Список поддерживаемых вендоров (для валидации/UI).
SUPPORTED_VENDORS = ["hikvision", "zkteco", "dahua", "suprema"]

__all__ = [
    "AccessDevice",
    "DeviceConn",
    "DeviceInfo",
    "EnrollResult",
    "HikvisionClient",
    "RawEvent",
    "DeviceService",
    "HikvisionService",
    "SUPPORTED_VENDORS",
]
