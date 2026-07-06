"""MockCamera — драйвер для разработки без железа.

Отдаёт синтетический JPEG-кадр (сгенерированный на лету), чтобы
live-превью в UI работало без реальной камеры.
"""
import io
import struct
import zlib

from app.services.cameras.base import CameraConn, CameraInfo, PTZCommand


def _placeholder_png() -> bytes:
    """Минимальный валидный PNG 16x16 тёмно-синего цвета (без Pillow)."""
    width = height = 16
    # один ряд: фильтр 0 + RGB пиксели
    pixel = bytes((13, 20, 38))  # тёмно-синий (#0d1426)
    raw = b"".join(b"\x00" + pixel * width for _ in range(height))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    buf = io.BytesIO()
    buf.write(sig)
    buf.write(chunk(b"IHDR", ihdr))
    buf.write(chunk(b"IDAT", zlib.compress(raw)))
    buf.write(chunk(b"IEND", b""))
    return buf.getvalue()


_FRAME = _placeholder_png()


class MockCamera:
    def __init__(self, conn: CameraConn) -> None:
        self.conn = conn

    async def test_connection(self) -> CameraInfo:
        return CameraInfo(online=True, detail="Mock-камера онлайн", model="MockCam-1")

    async def get_snapshot(self) -> bytes | None:
        return _FRAME

    async def get_stream_url(self) -> str | None:
        return self.conn.rtsp_url or f"rtsp://{self.conn.ip}:554/mock/stream"

    async def ptz_control(self, cmd: PTZCommand) -> bool:
        return True
