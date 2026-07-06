"""Фабрика драйверов камер: по объекту Camera выбирает драйвер.

Диспетчеризация по Camera.vendor:
- "onvif" (по умолчанию) → OnvifCamera
- "rtsp"                  → OnvifCamera (использует только rtsp_url)
- "mock"                  → MockCamera

Режим mock включается глобально через settings.HIKVISION_MODE == "mock"
(тот же флаг разработки, что и для СКУД) — чтобы UI работал без железа.
"""
from fastapi import HTTPException

from app.core.config import settings
from app.core.crypto import decrypt
from app.models import Camera
from app.services.cameras.base import CameraConn, VideoSource
from app.services.cameras.mock import MockCamera
from app.services.cameras.onvif import OnvifCamera


class CameraService:
    @staticmethod
    def driver_for(camera: Camera) -> VideoSource:
        try:
            password = decrypt(camera.password_encrypted)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Пароль камеры не удалось расшифровать "
                    "(SECRET_KEY изменился или повреждённая запись). "
                    "Откройте камеру → Редактировать → введите пароль заново."
                ),
            ) from None

        conn = CameraConn(
            ip=camera.ip,
            port=camera.port,
            username=camera.username,
            password=password,
            rtsp_url=camera.rtsp_url,
        )

        vendor = (getattr(camera, "vendor", None) or "onvif").lower()

        if settings.HIKVISION_MODE == "mock" or vendor == "mock":
            return MockCamera(conn)

        # onvif / rtsp — оба обслуживает OnvifCamera
        return OnvifCamera(conn)
