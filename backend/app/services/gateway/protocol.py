"""Протокол Edge Gateway: сериализация вызовов драйвера в JSON.

Позволяет облаку вызывать методы AccessDevice на удалённом агенте в LAN
клиента. Кодирует аргументы и результаты (включая bytes для лиц/снимков,
datetime для окна событий и dataclass'ы DeviceInfo/RawEvent/EnrollResult).

Формат сообщений (по WebSocket, поверх TLS):
  RPC-запрос:  {"type":"rpc","id":"<uuid>","method":"...","conn":{...},
                "kwargs":{...}}
  Результат:   {"type":"result","id":"<uuid>","ok":true,"value":<encoded>}
               {"type":"result","id":"<uuid>","ok":false,"error":"..."}
  Heartbeat:   {"type":"heartbeat"}
  События:     {"type":"events","device_id":"...","events":[...]}
"""
import base64
from datetime import datetime

from app.services.devices.base import DeviceConn, DeviceInfo, EnrollResult, RawEvent

# Реконструкция dataclass по имени.
_DATACLASSES = {
    "DeviceInfo": DeviceInfo,
    "RawEvent": RawEvent,
    "EnrollResult": EnrollResult,
    "DeviceConn": DeviceConn,
}


def encode_value(v):
    """Рекурсивно кодирует значение в JSON-совместимый вид."""
    if isinstance(v, bytes):
        return {"__b64__": base64.b64encode(v).decode("ascii")}
    if isinstance(v, datetime):
        return {"__dt__": v.isoformat()}
    if isinstance(v, (list, tuple)):
        return [encode_value(x) for x in v]
    if isinstance(v, dict):
        return {k: encode_value(x) for k, x in v.items()}
    cls_name = type(v).__name__
    if cls_name in _DATACLASSES and hasattr(v, "__dataclass_fields__"):
        return {
            "__dc__": cls_name,
            "fields": {f: encode_value(getattr(v, f)) for f in v.__dataclass_fields__},
        }
    return v  # str/int/float/bool/None


def decode_value(v):
    """Обратно к encode_value."""
    if isinstance(v, dict):
        if "__b64__" in v:
            return base64.b64decode(v["__b64__"])
        if "__dt__" in v:
            return datetime.fromisoformat(v["__dt__"])
        if "__dc__" in v:
            cls = _DATACLASSES[v["__dc__"]]
            fields = {k: decode_value(x) for k, x in v["fields"].items()}
            return cls(**fields)
        return {k: decode_value(x) for k, x in v.items()}
    if isinstance(v, list):
        return [decode_value(x) for x in v]
    return v


def encode_rpc(
    call_id: str, method: str, vendor: str, conn: DeviceConn, kwargs: dict
) -> dict:
    return {
        "type": "rpc",
        "id": call_id,
        "method": method,
        "vendor": vendor,
        "conn": encode_value(conn),
        "kwargs": encode_value(kwargs),
    }


def decode_rpc(msg: dict) -> tuple[str, str, str, DeviceConn, dict]:
    return (
        msg["id"],
        msg["method"],
        msg.get("vendor", "hikvision"),
        decode_value(msg["conn"]),
        decode_value(msg.get("kwargs", {})),
    )


def encode_result(call_id: str, value=None, error: str | None = None) -> dict:
    if error is not None:
        return {"type": "result", "id": call_id, "ok": False, "error": error}
    return {"type": "result", "id": call_id, "ok": True, "value": encode_value(value)}


def decode_result(msg: dict):
    if not msg.get("ok"):
        raise RuntimeError(msg.get("error") or "gateway rpc error")
    return decode_value(msg.get("value"))
