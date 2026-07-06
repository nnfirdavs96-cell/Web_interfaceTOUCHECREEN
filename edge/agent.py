"""Edge Gateway Agent — ставится в локальной сети клиента.

Держит исходящий WebSocket-туннель к облаку (решает NAT: не нужно
пробрасывать порты). Получает RPC-команды и выполняет их против устройств
LAN теми же драйверами, что и облако. Шлёт heartbeat.

Запуск:
    export CLOUD_WS_URL="wss://<сервер>/api/v1/gateways/ws"
    export GATEWAY_TOKEN="<токен-из-UI>"
    python -m edge.agent          # реальные драйверы
    python -m edge.agent --mock   # без железа (MockClient) — для проверки туннеля

Требует пакет websockets и доступ к пакету app.services (общий код драйверов).
"""
import argparse
import asyncio
import json
import logging
import os

import websockets

from app.services.gateway import executor, protocol

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("edge.agent")

HEARTBEAT_SEC = 20
RECONNECT_SEC = 3


async def _heartbeat(ws) -> None:
    while True:
        await asyncio.sleep(HEARTBEAT_SEC)
        await ws.send(json.dumps({"type": "heartbeat"}))


async def _handle_rpc(ws, msg: dict, mock: bool) -> None:
    call_id, method, vendor, conn, kwargs = protocol.decode_rpc(msg)
    try:
        result = await executor.execute(vendor, conn, method, kwargs, mock=mock)
        await ws.send(json.dumps(protocol.encode_result(call_id, value=result)))
    except Exception as e:  # noqa: BLE001
        log.warning("rpc %s failed: %s", method, e)
        await ws.send(json.dumps(protocol.encode_result(call_id, error=str(e))))


async def run(url: str, token: str, mock: bool = False) -> None:
    full = f"{url}?token={token}"
    log.info("Edge agent starting → %s (mock=%s)", url, mock)
    async for ws in websockets.connect(full, ping_interval=30):
        log.info("tunnel connected")
        hb = asyncio.create_task(_heartbeat(ws))
        try:
            async for raw in ws:
                msg = json.loads(raw)
                if msg.get("type") == "rpc":
                    asyncio.create_task(_handle_rpc(ws, msg, mock))
        except websockets.ConnectionClosed:
            log.info("tunnel closed, reconnecting in %ss", RECONNECT_SEC)
        finally:
            hb.cancel()
        await asyncio.sleep(RECONNECT_SEC)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=os.getenv("CLOUD_WS_URL", ""))
    ap.add_argument("--token", default=os.getenv("GATEWAY_TOKEN", ""))
    ap.add_argument("--mock", action="store_true")
    args = ap.parse_args()
    if not args.url or not args.token:
        raise SystemExit("CLOUD_WS_URL и GATEWAY_TOKEN обязательны")
    asyncio.run(run(args.url, args.token, mock=args.mock))


if __name__ == "__main__":
    main()
