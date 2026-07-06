"""Реестр подключённых Edge Gateway'ев (облачная сторона).

Хранит активные WS-подключения агентов и выполняет RPC: отправляет вызов
в туннель, ждёт результат по correlation id с таймаутом. Процесс-локальный
(in-memory) — для нескольких воркеров нужен внешний брокер (Redis pub/sub),
это отдельное улучшение.
"""
import asyncio
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from app.services.gateway import protocol
from app.services.devices.base import DeviceConn


class GatewayConnection:
    """Одно подключение агента: отправка сообщений + ожидание результатов."""

    def __init__(self, send: Callable[[dict], Awaitable[None]]) -> None:
        self._send = send
        self._pending: dict[str, asyncio.Future] = {}

    async def call(
        self,
        method: str,
        vendor: str,
        conn: DeviceConn,
        kwargs: dict,
        *,
        timeout: float = 30.0,
    ) -> Any:
        call_id = uuid.uuid4().hex
        loop = asyncio.get_event_loop()
        fut: asyncio.Future = loop.create_future()
        self._pending[call_id] = fut
        try:
            await self._send(protocol.encode_rpc(call_id, method, vendor, conn, kwargs))
            msg = await asyncio.wait_for(fut, timeout=timeout)
            return protocol.decode_result(msg)
        finally:
            self._pending.pop(call_id, None)

    def resolve(self, msg: dict) -> None:
        """Обработать пришедший от агента result: разбудить ожидающий call()."""
        fut = self._pending.get(msg.get("id", ""))
        if fut and not fut.done():
            fut.set_result(msg)

    def fail_all(self, error: str) -> None:
        for fut in self._pending.values():
            if not fut.done():
                fut.set_exception(RuntimeError(error))
        self._pending.clear()


class GatewayRegistry:
    """Глобальный реестр gateway_id → GatewayConnection."""

    def __init__(self) -> None:
        self._conns: dict[str, GatewayConnection] = {}

    def register(self, gateway_id: str, conn: GatewayConnection) -> None:
        self._conns[gateway_id] = conn

    def unregister(self, gateway_id: str) -> None:
        c = self._conns.pop(gateway_id, None)
        if c:
            c.fail_all("gateway disconnected")

    def get(self, gateway_id: str) -> GatewayConnection | None:
        return self._conns.get(gateway_id)

    def is_online(self, gateway_id: str) -> bool:
        return gateway_id in self._conns


# Глобальный реестр процесса.
registry = GatewayRegistry()
