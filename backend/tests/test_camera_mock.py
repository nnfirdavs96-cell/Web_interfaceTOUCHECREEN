import asyncio

from app.services.cameras.base import CameraConn, PTZCommand
from app.services.cameras.mock import MockCamera


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def _cam() -> MockCamera:
    return MockCamera(
        CameraConn(ip="10.0.0.2", port=80, username="admin", password="x")
    )


def test_mock_camera_online():
    info = _run(_cam().test_connection())
    assert info.online is True
    assert info.model


def test_mock_camera_snapshot_is_png():
    img = _run(_cam().get_snapshot())
    assert img is not None
    # валидная PNG-сигнатура
    assert img[:8] == b"\x89PNG\r\n\x1a\n"


def test_mock_camera_stream_url():
    url = _run(_cam().get_stream_url())
    assert url and url.startswith("rtsp://")


def test_mock_camera_ptz_returns_true():
    assert _run(_cam().ptz_control(PTZCommand.UP)) is True
