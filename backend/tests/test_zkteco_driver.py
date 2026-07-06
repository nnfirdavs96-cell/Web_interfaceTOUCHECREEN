import asyncio

from app.services.devices.base import DeviceConn
from app.services.devices.zkteco import (
    ZKTecoDriver,
    _comm_key,
    _uid_from_external,
)


def test_comm_key_parsing():
    assert _comm_key("") == 0
    assert _comm_key("123") == 123
    assert _comm_key("abc") == 0


def test_uid_from_external_numeric_and_hashed():
    assert _uid_from_external("100") == 100
    uid = _uid_from_external("EMP-abc")
    assert 1 <= uid <= 65535


def test_unsupported_ops_are_graceful():
    d = ZKTecoDriver(
        DeviceConn(ip="127.0.0.1", port=4370, username="admin", password="0")
    )
    face = asyncio.get_event_loop().run_until_complete(d.capture_face("100"))
    assert face.success is False
    snap = asyncio.get_event_loop().run_until_complete(d.get_snapshot())
    assert snap is None
    sched = asyncio.get_event_loop().run_until_complete(d.ensure_24x7_schedule())
    assert sched is True
