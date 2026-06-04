"""In-memory WebSocket connection manager (live attendance events).

В production стоит заменить Redis pub/sub, но для одного backend-инстанса достаточно.
"""
import asyncio
import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self.connections.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self.connections.discard(ws)

    async def broadcast(self, message: dict[str, Any]) -> None:
        payload = json.dumps(message, default=str)
        async with self._lock:
            conns = list(self.connections)
        for ws in conns:
            try:
                await ws.send_text(payload)
            except Exception:
                await self.disconnect(ws)


manager = ConnectionManager()
