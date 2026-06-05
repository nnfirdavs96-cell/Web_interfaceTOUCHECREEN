import asyncio
from datetime import datetime, timedelta, timezone

from app.services.hikvision.base import DeviceConn
from app.services.hikvision.mock import MockClient


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def test_mock_test_connection_returns_online():
    client = MockClient(DeviceConn(ip="10.0.0.1", port=80, username="admin", password="x"))
    info = _run(client.test_connection())
    assert info.online is True
    assert info.serial_number and info.serial_number.startswith("MOCK-")
    assert info.firmware


def test_mock_fetch_events_returns_list():
    client = MockClient(DeviceConn(ip="10.0.0.1", port=80, username="admin", password="x"))
    now = datetime.now(timezone.utc)
    events = _run(client.fetch_events(now - timedelta(minutes=5), now))
    assert isinstance(events, list)
    for e in events:
        assert e.event_type in ("entry", "exit")
        assert e.success is True


def test_mock_fetch_events_empty_window():
    client = MockClient(DeviceConn(ip="10.0.0.1", port=80, username="admin", password="x"))
    now = datetime.now(timezone.utc)
    events = _run(client.fetch_events(now, now))
    assert events == []
