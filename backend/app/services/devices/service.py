"""Фабрика драйверов: по объекту Device выбирает драйвер вендора.

Диспетчеризация по Device.vendor:
- "hikvision" (по умолчанию) → IsapiClient / MockClient
- "zkteco"                   → ZKTecoDriver
- (dahua, suprema — добавляются здесь же по мере реализации)

Режим mock/isapi для Hikvision управляется settings.HIKVISION_MODE.
"""
from fastapi import HTTPException

from app.core.config import settings
from app.core.crypto import decrypt
from app.models import Device
from app.services.devices.base import AccessDevice, DeviceConn
from app.services.devices.hikvision import IsapiClient
from app.services.devices.mock import MockClient
from app.services.devices.zkteco import ZKTecoDriver


class DeviceService:
    """Возвращает драйвер, реализующий AccessDevice, для конкретного устройства."""

    @staticmethod
    def driver_for(device: Device) -> AccessDevice:
        try:
            password = decrypt(device.password_encrypted)
        except Exception:
            # Чаще всего — изменился SECRET_KEY и старый зашифрованный пароль
            # больше не расшифровывается. UI должен показать понятное сообщение.
            raise HTTPException(
                status_code=400,
                detail=(
                    "Пароль устройства не удалось расшифровать "
                    "(SECRET_KEY изменился или повреждённая запись). "
                    "Откройте устройство → ✏ Редактировать → введите пароль заново в "
                    "поле «Новый пароль» и сохраните."
                ),
            ) from None

        conn = DeviceConn(
            ip=device.ip,
            port=device.port,
            username=device.username,
            password=password,
        )

        vendor = (getattr(device, "vendor", None) or "hikvision").lower()

        if vendor == "zkteco":
            return ZKTecoDriver(conn)

        # vendor == "hikvision" (и любой неизвестный — fallback на Hikvision)
        if settings.HIKVISION_MODE == "isapi":
            return IsapiClient(conn)
        return MockClient(conn)


# Обратная совместимость: старый фасад HikvisionService.client_for().
class HikvisionService:
    @staticmethod
    def client_for(device: Device) -> AccessDevice:
        return DeviceService.driver_for(device)
