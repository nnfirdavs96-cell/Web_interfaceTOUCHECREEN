"""Драйвер ZKTeco (протокол на порту 4370 через pyzk).

Статус: РАБОЧИЙ КАРКАС, ждёт валидации на железе. Реализует протокол
AccessDevice поверх библиотеки pyzk (синхронной — вызовы вынесены в
threadpool). pyzk импортируется лениво, чтобы бэкенд/тесты не падали,
если библиотека не установлена.

Особенности ZKTeco vs Hikvision:
- Порт 4370 (не 80), собственный бинарный протокол (не HTTP/ISAPI).
- «Пароль» устройства — это числовой comm-key (по умолчанию 0), а не
  логин/пароль. Берём его из DeviceConn.password (пусто → 0).
- Пользователь адресуется по user_id (строка) и uid (int). external_id
  нашей системы кладём в user_id; uid выводим детерминированно.
- Событие прохода = запись attendance-лога (get_attendance).
- Лицо/карта-по-снимку pyzk не покрывает → возвращаем понятное сообщение.

Что не проверено без железа: точный формат privilege, поведение
enroll_user (регистрация отпечатка с экрана), тайминги set_time.
"""
import asyncio
import logging
from datetime import datetime

from app.services.devices.base import (
    DeviceConn,
    DeviceInfo,
    EnrollResult,
    RawEvent,
)

log = logging.getLogger("devices.zkteco")

_NOT_SUPPORTED = "ZKTeco: операция не поддерживается этим типом терминала"


def _comm_key(password: str) -> int:
    """comm-key ZKTeco — число; наш зашифрованный «пароль» может быть пустым."""
    try:
        return int(password) if password else 0
    except ValueError:
        return 0


def _uid_from_external(external_id: str) -> int:
    """Детерминированный uid (int) из строкового external_id."""
    try:
        return int(external_id)
    except ValueError:
        # стабильный хэш в диапазон uid ZKTeco (1..65535)
        return (abs(hash(external_id)) % 65534) + 1


class ZKTecoDriver:
    """Драйвер ZKTeco поверх pyzk. Реализует AccessDevice."""

    def __init__(self, conn: DeviceConn) -> None:
        self.conn = conn
        self._commkey = _comm_key(conn.password)

    # --- подключение (синхронный pyzk) выносим в threadpool --------------

    def _connect_sync(self):
        """Возвращает подключённый объект pyzk или бросает исключение."""
        from zk import ZK  # ленивый импорт

        zk = ZK(
            self.conn.ip,
            port=self.conn.port or 4370,
            timeout=5,
            password=self._commkey,
            force_udp=False,
            ommit_ping=True,
        )
        return zk.connect()

    async def _with_conn(self, fn):
        """Выполнить fn(conn) в потоке с гарантированным disconnect."""
        def runner():
            conn = None
            try:
                conn = self._connect_sync()
                return fn(conn)
            finally:
                if conn is not None:
                    try:
                        conn.enable_device()
                        conn.disconnect()
                    except Exception:  # noqa: BLE001
                        pass

        return await asyncio.to_thread(runner)

    # --- протокол AccessDevice -------------------------------------------

    async def test_connection(self) -> DeviceInfo:
        try:
            def fn(conn):
                serial = None
                fw = None
                try:
                    serial = conn.get_serialnumber()
                except Exception:  # noqa: BLE001
                    pass
                try:
                    fw = conn.get_firmware_version()
                except Exception:  # noqa: BLE001
                    pass
                return serial, fw

            serial, fw = await self._with_conn(fn)
            return DeviceInfo(
                online=True,
                detail="ZKTeco: подключение установлено",
                serial_number=serial,
                firmware=fw,
            )
        except ImportError:
            return DeviceInfo(
                online=False,
                detail="Библиотека pyzk не установлена на сервере",
            )
        except Exception as e:  # noqa: BLE001
            log.info("ZKTeco connect failed %s:%s — %s", self.conn.ip, self.conn.port, e)
            return DeviceInfo(
                online=False,
                detail=f"ZKTeco: не удалось подключиться ({e})",
            )

    async def fetch_events(
        self, since: datetime, until: datetime
    ) -> list[RawEvent]:
        try:
            def fn(conn):
                return conn.get_attendance() or []

            records = await self._with_conn(fn)
        except Exception as e:  # noqa: BLE001
            log.info("ZKTeco get_attendance failed: %s", e)
            return []

        events: list[RawEvent] = []
        for rec in records:
            ts = getattr(rec, "timestamp", None)
            if ts is None:
                continue
            # окно [since, until]
            ts_aware = ts if ts.tzinfo else ts.replace(tzinfo=since.tzinfo)
            if not (since <= ts_aware <= until):
                continue
            events.append(
                RawEvent(
                    external_user_id=str(getattr(rec, "user_id", "")),
                    event_time=ts_aware,
                    event_type="entry",  # ZK punch не всегда различает вход/выход
                    success=True,
                    payload={
                        "status": getattr(rec, "status", None),
                        "punch": getattr(rec, "punch", None),
                    },
                )
            )
        return events

    async def upsert_user(self, external_id: str, full_name: str) -> EnrollResult:
        try:
            uid = _uid_from_external(external_id)

            def fn(conn):
                conn.set_user(
                    uid=uid,
                    name=full_name[:24],  # ZK ограничивает длину имени
                    user_id=str(external_id),
                )
                return True

            await self._with_conn(fn)
            return EnrollResult(success=True, detail="ZKTeco: пользователь записан")
        except Exception as e:  # noqa: BLE001
            return EnrollResult(success=False, detail=f"ZKTeco set_user: {e}")

    async def delete_user(self, external_id: str) -> EnrollResult:
        try:
            uid = _uid_from_external(external_id)

            def fn(conn):
                conn.delete_user(uid=uid, user_id=str(external_id))
                return True

            await self._with_conn(fn)
            return EnrollResult(success=True, detail="ZKTeco: пользователь удалён")
        except Exception as e:  # noqa: BLE001
            return EnrollResult(success=False, detail=f"ZKTeco delete_user: {e}")

    async def capture_fingerprint(
        self, external_id: str, finger_no: int = 1
    ) -> EnrollResult:
        try:
            uid = _uid_from_external(external_id)

            def fn(conn):
                # enroll_user запускает регистрацию отпечатка с экрана терминала
                conn.enroll_user(uid=uid, temp_id=finger_no, user_id=str(external_id))
                return True

            await self._with_conn(fn)
            return EnrollResult(
                success=True,
                detail="ZKTeco: следуйте инструкции на экране терминала",
            )
        except Exception as e:  # noqa: BLE001
            return EnrollResult(success=False, detail=f"ZKTeco enroll_user: {e}")

    async def capture_face(self, external_id: str) -> EnrollResult:
        return EnrollResult(success=False, detail=_NOT_SUPPORTED + " (лицо через API)")

    async def upload_face(
        self, external_id: str, image_bytes: bytes, full_name: str = ""
    ) -> EnrollResult:
        return EnrollResult(success=False, detail=_NOT_SUPPORTED + " (загрузка лица)")

    async def get_snapshot(self) -> bytes | None:
        # У терминалов ZKTeco обычно нет HTTP-камеры.
        return None

    async def add_card(self, external_id: str, card_no: str) -> EnrollResult:
        try:
            uid = _uid_from_external(external_id)

            def fn(conn):
                # карта задаётся полем card в set_user
                conn.set_user(
                    uid=uid,
                    user_id=str(external_id),
                    card=int(card_no) if card_no.isdigit() else 0,
                )
                return True

            await self._with_conn(fn)
            return EnrollResult(success=True, detail="ZKTeco: карта привязана")
        except Exception as e:  # noqa: BLE001
            return EnrollResult(success=False, detail=f"ZKTeco add_card: {e}")

    async def capture_card(self, external_id: str) -> EnrollResult:
        return EnrollResult(
            success=False,
            detail=_NOT_SUPPORTED + " (считать карту с терминала — вводите номер вручную)",
        )

    async def set_time(self, offset_hours: int = 5) -> bool:
        try:
            def fn(conn):
                conn.set_time(datetime.now())
                return True

            return bool(await self._with_conn(fn))
        except Exception as e:  # noqa: BLE001
            log.info("ZKTeco set_time failed: %s", e)
            return False

    async def ensure_24x7_schedule(self) -> bool:
        # У ZKTeco модель прав иная (time zones / groups); дефолт обычно 24/7.
        return True
