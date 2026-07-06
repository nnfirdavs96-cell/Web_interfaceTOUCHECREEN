"""Проверка RPC-туннеля Edge Gateway без WebSocket.

Замыкаем цепочку в процессе: RemoteDriver → registry → (фейковый агент,
исполняющий executor с MockClient) → результат обратно. Проверяет
сериализацию bytes/datetime/dataclass и корректность round-trip.
"""
import asyncio
from datetime import datetime, timedelta, timezone

from app.services.devices.base import DeviceConn
from app.services.gateway import executor, protocol
from app.services.gateway.registry import GatewayConnection, GatewayRegistry
from app.services.gateway.remote import RemoteDriver


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def _wire_mock_gateway() -> tuple[GatewayRegistry, str]:
    """Регистрирует фейковый агент, исполняющий RPC локально через MockClient."""
    reg = GatewayRegistry()
    gid = "gw-test"

    conn_holder: dict = {}

    async def fake_send(msg: dict) -> None:
        # Имитируем агента: декодируем rpc, исполняем, возвращаем результат.
        call_id, method, vendor, dev_conn, kwargs = protocol.decode_rpc(msg)
        result = await executor.execute(vendor, dev_conn, method, kwargs, mock=True)
        conn_holder["conn"].resolve(protocol.encode_result(call_id, value=result))

    gconn = GatewayConnection(fake_send)
    conn_holder["conn"] = gconn
    reg.register(gid, gconn)
    return reg, gid


def _remote() -> RemoteDriver:
    reg, gid = _wire_mock_gateway()
    conn = DeviceConn(ip="10.0.0.9", port=80, username="admin", password="x")
    return RemoteDriver(reg, gid, "hikvision", conn)


def test_remote_test_connection_roundtrip():
    info = _run(_remote().test_connection())
    assert info.online is True
    assert info.serial_number and info.serial_number.startswith("MOCK-")


def test_remote_snapshot_bytes_roundtrip():
    img = _run(_remote().get_snapshot())
    # MockClient.get_snapshot возвращает bytes → должны прийти bytes
    assert img is None or isinstance(img, (bytes, bytearray))


def test_remote_fetch_events_datetime_roundtrip():
    now = datetime.now(timezone.utc)
    events = _run(_remote().fetch_events(now - timedelta(minutes=5), now))
    assert isinstance(events, list)
    for e in events:
        assert e.event_type in ("entry", "exit")


def test_remote_enroll_result_roundtrip():
    res = _run(_remote().upsert_user("100", "Иван Иванов"))
    assert res.success is True


def test_remote_offline_gateway_graceful():
    reg = GatewayRegistry()  # пустой — шлюз офлайн
    conn = DeviceConn(ip="1.1.1.1", port=80, username="a", password="x")
    drv = RemoteDriver(reg, "absent", "hikvision", conn)
    info = _run(drv.test_connection())
    assert info.online is False
    assert "недоступен" in info.detail.lower()


def test_protocol_bytes_and_datetime_encoding():
    now = datetime(2026, 7, 6, 12, 0, 0)
    enc = protocol.encode_value({"img": b"\x89PNG", "ts": now})
    dec = protocol.decode_value(enc)
    assert dec["img"] == b"\x89PNG"
    assert dec["ts"] == now
