"""Фасад: по объекту Device создаёт подходящий клиент (mock/isapi) с расшифрованным паролем."""
from fastapi import HTTPException

from app.core.config import settings
from app.core.crypto import decrypt
from app.models import Device
from app.services.hikvision.base import DeviceConn, HikvisionClient
from app.services.hikvision.isapi import IsapiClient
from app.services.hikvision.mock import MockClient


class HikvisionService:
    @staticmethod
    def client_for(device: Device) -> HikvisionClient:
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
        if settings.HIKVISION_MODE == "isapi":
            return IsapiClient(conn)
        return MockClient(conn)
