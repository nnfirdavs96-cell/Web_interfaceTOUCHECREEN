import asyncio

from app.services.devices.base import DeviceConn
from app.services.devices.dahua import DahuaDriver
from app.services.devices.suprema import SupremaDriver


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def _conn(port=80):
    return DeviceConn(ip="127.0.0.1", port=port, username="admin", password="x")


def test_dahua_unsupported_ops_graceful():
    d = DahuaDriver(_conn())
    assert _run(d.upsert_user("1", "A")).success is False
    assert _run(d.capture_face("1")).success is False
    assert _run(d.ensure_24x7_schedule()) is True


def test_dahua_offline_test_connection():
    d = DahuaDriver(_conn())
    info = _run(d.test_connection())
    # нет железа на 127.0.0.1:80 → online False, но без исключений
    assert info.online is False


def test_suprema_needs_biostar():
    s = SupremaDriver(_conn(443))
    info = _run(s.test_connection())
    assert info.online is False
    assert _run(s.upsert_user("1", "A")).success is False
    assert _run(s.get_snapshot()) is None


def test_dispatch_supported_vendors():
    from app.services.devices import SUPPORTED_VENDORS

    assert set(SUPPORTED_VENDORS) == {"hikvision", "zkteco", "dahua", "suprema"}
