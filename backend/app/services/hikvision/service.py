"""Фасад: по объекту Device создаёт подходящий клиент (mock/isapi) с расшифрованным паролем."""
from app.core.config import settings
from app.core.crypto import decrypt
from app.models import Device
from app.services.hikvision.base import DeviceConn, HikvisionClient
from app.services.hikvision.isapi import IsapiClient
from app.services.hikvision.mock import MockClient


class HikvisionService:
    @staticmethod
    def client_for(device: Device) -> HikvisionClient:
        conn = DeviceConn(
            ip=device.ip,
            port=device.port,
            username=device.username,
            password=decrypt(device.password_encrypted),
        )
        if settings.HIKVISION_MODE == "isapi":
            return IsapiClient(conn)
        return MockClient(conn)
