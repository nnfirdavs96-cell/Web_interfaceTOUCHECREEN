"""Camera Abstraction Layer — единый интерфейс IP-камеры.

Отдельно от Device Abstraction Layer (СКУД). Реализации-драйверы:
- MockCamera   — для разработки без железа (генерирует placeholder-кадр)
- OnvifCamera  — ONVIF/RTSP (универсально для большинства IP-камер)

Драйвер выбирается по Camera.vendor через CameraService.driver_for().

Замечание про live-видео: RTSP не воспроизводится нативно в браузере.
Для MVP используем polling snapshot (JPEG по HTTP). Полноценный
low-latency стрим — через транскодер RTSP→WebRTC/HLS (MediaMTX),
это отдельный инфраструктурный этап; get_stream_url() уже готов его
обслуживать.
"""
from dataclasses import dataclass
from enum import Enum
from typing import Protocol


@dataclass
class CameraConn:
    ip: str
    port: int
    username: str
    password: str
    rtsp_url: str | None = None


@dataclass
class CameraInfo:
    online: bool
    detail: str
    model: str | None = None


class PTZCommand(str, Enum):
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    STOP = "stop"


class VideoSource(Protocol):
    """Единый протокол для любой IP-камеры независимо от вендора."""

    async def test_connection(self) -> CameraInfo: ...
    async def get_snapshot(self) -> bytes | None: ...
    async def get_stream_url(self) -> str | None: ...
    async def ptz_control(self, cmd: PTZCommand) -> bool: ...
