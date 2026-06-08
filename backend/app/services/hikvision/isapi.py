"""ISAPI-клиент для реальных устройств Hikvision (DS-K1T343 и аналоги).

Поддерживает обе формы ответа (JSON и XML) — некоторые модели возвращают XML
даже при `format=json`. Авторизация — HTTP Digest.
"""
import asyncio
import json
import logging
import re
import shutil
import tempfile
import uuid
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

import httpx
from httpx import DigestAuth

from app.services.hikvision.base import DeviceConn, DeviceInfo, EnrollResult, RawEvent

log = logging.getLogger("hikvision.isapi")


def _strip_ns(tag: str) -> str:
    return re.sub(r"^\{[^}]+\}", "", tag)


def _xml_to_dict(elem: ET.Element) -> dict:
    result: dict = {}
    for child in elem:
        key = _strip_ns(child.tag)
        if len(child) > 0:
            result[key] = _xml_to_dict(child)
        else:
            result[key] = child.text
    return result


def _fmt_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat(timespec="seconds")


SUCCESS_MINORS = {38, 39, 40, 75, 76, 77, 84, 85, 86, 87}


class IsapiClient:
    def __init__(self, conn: DeviceConn, timeout: float = 15.0):
        self.conn = conn
        self.base = f"http://{conn.ip}:{conn.port}"
        self.auth = DigestAuth(conn.username, conn.password)
        self.timeout = timeout

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base, auth=self.auth, timeout=self.timeout)

    @staticmethod
    def _parse(r: httpx.Response) -> dict:
        text = (r.text or "").lstrip()
        try:
            if text.startswith("<"):
                root = ET.fromstring(text)
                return {_strip_ns(root.tag): _xml_to_dict(root)}
            return r.json()
        except Exception as e:
            log.warning("parse failed: %s; body=%s", e, text[:200])
            return {}

    @staticmethod
    def _success(data: dict) -> tuple[bool, str]:
        """Hikvision возвращает ResponseStatus.statusCode == 1 при успехе."""
        rs = data.get("ResponseStatus") or data
        status_code = rs.get("statusCode") or rs.get("statusValue")
        status_str = rs.get("statusString") or rs.get("subStatusCode") or ""
        try:
            ok = int(status_code or 0) == 1
        except (TypeError, ValueError):
            ok = False
        return ok, str(status_str)

    @staticmethod
    def _friendly_error(data: dict, r: httpx.Response, fallback: str = "") -> str:
        """Преобразует raw-ответ Hikvision в понятное русскоязычное сообщение."""
        rs = data.get("ResponseStatus") or data
        sub = str(rs.get("subStatusCode") or "").lower()
        msg = rs.get("errorMsg") or rs.get("statusString") or fallback

        friendly = {
            "cardnoalreadyexist": "Карта с таким номером уже привязана к другому сотруднику",
            "userexist": "Пользователь с таким employeeNo уже существует",
            "employeenoexist": "Пользователь с таким employeeNo уже существует",
            "nouser": "Сначала отправьте сотрудника на устройство (шаг 1)",
            "checkemployeeno": "Сотрудник с таким employeeNo не найден на устройстве",
            "badjsoncontent": "Неверный JSON формат запроса",
            "badxmlcontent": "Неверный XML формат запроса",
            "notsupport": "Операция не поддерживается этой моделью/прошивкой",
            "lowdevicememory": "На устройстве закончилось место",
            "deviceisbusy": "Устройство занято, попробуйте через 5 секунд",
            "subpicanalysismodelingerror": "Лицо не распознано на снимке. Сделайте снимок снова: смотрите прямо в камеру, лицо должно занимать большую часть кадра",
            "savefacepic": "Не удалось сохранить фото лица — попробуйте другой ракурс или освещение",
            "lowimagequality": "Слишком плохое качество снимка",
            "facenotdetected": "Лицо не обнаружено на фото",
        }
        for key, ru in friendly.items():
            if key in sub:
                return ru
        return f"{msg} ({sub})" if sub else (msg or f"HTTP {r.status_code}")

    # ---------- info ----------

    async def test_connection(self) -> DeviceInfo:
        try:
            async with self._client() as c:
                r = await c.get("/ISAPI/System/deviceInfo?format=json")
                if r.status_code == 401:
                    return DeviceInfo(
                        online=False,
                        detail="❌ Неверный логин или пароль устройства",
                    )
                if r.status_code == 403:
                    return DeviceInfo(
                        online=False,
                        detail="❌ Доступ запрещён — у пользователя нет прав ISAPI",
                    )
                if r.status_code == 404:
                    return DeviceInfo(
                        online=False,
                        detail="❌ Endpoint не найден — проверьте порт (обычно 80, не 8000)",
                    )
                if r.status_code != 200:
                    return DeviceInfo(
                        online=False,
                        detail=f"HTTP {r.status_code}: {r.text[:120]}",
                    )
                data = self._parse(r)
                info = data.get("DeviceInfo") or data
                return DeviceInfo(
                    online=True,
                    detail=f"OK · {info.get('model') or info.get('deviceName') or 'Hikvision'}",
                    serial_number=info.get("serialNumber"),
                    firmware=info.get("firmwareVersion"),
                )
        except httpx.ConnectError:
            return DeviceInfo(
                online=False,
                detail=(
                    "❌ Устройство не отвечает. Проверьте: 1) включено ли оно, "
                    "2) правильный ли IP, 3) порт (обычно 80), 4) есть ли сеть с сервера к устройству"
                ),
            )
        except httpx.ConnectTimeout:
            return DeviceInfo(
                online=False,
                detail="❌ Тайм-аут подключения — устройство недоступно по сети",
            )
        except httpx.ReadTimeout:
            return DeviceInfo(
                online=False,
                detail="❌ Устройство не успело ответить (перегружено или зависло)",
            )
        except Exception as e:
            return DeviceInfo(online=False, detail=f"❌ Ошибка: {str(e)[:200]}")

    # ---------- events ----------

    async def fetch_events(self, since: datetime, until: datetime) -> list[RawEvent]:
        events: list[RawEvent] = []
        search_id = str(uuid.uuid4())
        position = 0
        max_per_request = 30

        try:
            async with self._client() as c:
                while True:
                    body = {
                        "AcsEventCond": {
                            "searchID": search_id,
                            "searchResultPosition": position,
                            "maxResults": max_per_request,
                            "major": 5,
                            "minor": 0,
                            "startTime": _fmt_iso(since),
                            "endTime": _fmt_iso(until),
                        }
                    }
                    r = await c.post("/ISAPI/AccessControl/AcsEvent?format=json", json=body)
                    if r.status_code != 200:
                        log.warning("AcsEvent HTTP %s: %s", r.status_code, r.text[:200])
                        break

                    data = self._parse(r)
                    acs = data.get("AcsEvent") or data
                    info_list = acs.get("InfoList") or []
                    if isinstance(info_list, dict):
                        info_list = [info_list]

                    for item in info_list:
                        ext_id = (
                            item.get("employeeNoString")
                            or item.get("employeeNo")
                            or item.get("cardNo")
                        )
                        time_str = item.get("time")
                        if not (ext_id and time_str):
                            continue
                        try:
                            ev_time = datetime.fromisoformat(time_str)
                            if ev_time.tzinfo is None:
                                ev_time = ev_time.replace(tzinfo=timezone.utc)
                            ev_time = ev_time.astimezone(timezone.utc)
                        except (ValueError, TypeError):
                            continue
                        minor = int(item.get("minor") or 0)
                        result_type = item.get("eventResultType")
                        success = (
                            int(result_type) == 1
                            if result_type is not None
                            else (minor in SUCCESS_MINORS)
                        )
                        events.append(
                            RawEvent(
                                external_user_id=str(ext_id),
                                event_time=ev_time,
                                event_type="entry",
                                success=success,
                                payload=item,
                            )
                        )

                    fetched = len(info_list)
                    total = int(acs.get("totalMatches") or 0)
                    status_str = (acs.get("responseStatusStrg") or "").upper()
                    position += fetched

                    if (
                        fetched == 0
                        or fetched < max_per_request
                        or status_str.startswith("NO MATCH")
                        or (total and position >= total)
                    ):
                        break
        except Exception as e:
            log.warning("fetch_events failed: %s", e)

        return events

    # ---------- user / credentials ----------

    async def upsert_user(self, external_id: str, full_name: str) -> EnrollResult:
        """Создаёт/обновляет пользователя на устройстве.

        Прошивка DS-K1T343 V4.48 хочет одиночный объект `UserInfo` (не массив).
        Сначала POST /UserInfo/Record, при «exists» — PUT /UserInfo/Modify.
        """
        name_bytes = full_name.encode("utf-8")[:128]
        safe_name = name_bytes.decode("utf-8", errors="ignore") or "Employee"

        user_info = {
            "employeeNo": str(external_id),
            "name": safe_name,
            "userType": "normal",
            "Valid": {
                "enable": True,
                "beginTime": "2024-01-01T00:00:00",
                "endTime": "2037-12-31T23:59:59",
                "timeType": "local",
            },
            "doorRight": "1",
            "RightPlan": [{"doorNo": 1, "planTemplateNo": "1"}],
        }
        body = {"UserInfo": user_info}  # одиночный объект, не массив!

        async def _call(method: str, path: str) -> tuple[httpx.Response, dict, bool, str]:
            async with self._client() as c:
                r = await c.request(method, path, json=body)
                data = self._parse(r)
                ok, detail = self._success(data)
                return r, data, ok, detail

        try:
            # 1) создать
            r, data, ok, detail = await _call(
                "POST", "/ISAPI/AccessControl/UserInfo/Record?format=json"
            )

            # 2) если уже существует — обновить
            rs = data.get("ResponseStatus") or data
            sub = str(rs.get("subStatusCode") or "")
            if not ok and ("exist" in sub.lower() or "exist" in detail.lower()):
                r, data, ok, detail = await _call(
                    "PUT", "/ISAPI/AccessControl/UserInfo/Modify?format=json"
                )

            if not ok:
                return EnrollResult(
                    success=False,
                    detail=self._friendly_error(data, r, detail),
                )
            return EnrollResult(
                success=True,
                detail=f"OK · employeeNo={external_id}",
                value_ref=str(external_id),
            )
        except Exception as e:
            return EnrollResult(success=False, detail=f"Exception: {e}"[:400])

    async def delete_user(self, external_id: str) -> EnrollResult:
        body = {
            "UserInfoDelCond": {
                "EmployeeNoList": [{"employeeNo": str(external_id)}]
            }
        }
        try:
            async with self._client() as c:
                r = await c.put(
                    "/ISAPI/AccessControl/UserInfo/Delete?format=json", json=body
                )
                data = self._parse(r)
                ok, detail = self._success(data)
                return EnrollResult(success=ok, detail=detail or "OK")
        except Exception as e:
            return EnrollResult(success=False, detail=str(e)[:200])

    async def capture_fingerprint(self, external_id: str, finger_no: int = 1) -> EnrollResult:
        """Двухшаговая регистрация отпечатка (проверено на DS-K1T343 V4.48):

        1) POST /CaptureFingerPrint (XML) → терминал «Поднесите палец»,
           возвращает fingerData (base64-шаблон)
        2) POST /FingerPrintDownload (JSON) с этим fingerData → сохраняет
           отпечаток сотруднику (numOfFP += 1)

        Между шагами используются ОТДЕЛЬНЫЕ HTTP-клиенты, потому что httpx
        Digest auth кэширует nonce и не делает retry на втором запросе.
        """
        xml_body = (
            f"<CaptureFingerPrintCond>"
            f"<fingerNo>{finger_no}</fingerNo>"
            f"</CaptureFingerPrintCond>"
        )

        # --- Шаг 1: захват (отдельный клиент) ---
        finger_data: str | None = None
        quality = 0
        try:
            async with self._client() as c:
                log.info("fingerprint step 1: capture for employeeNo=%s", external_id)
                r = await c.post(
                    "/ISAPI/AccessControl/CaptureFingerPrint",
                    headers={"Content-Type": "application/xml"},
                    content=xml_body,
                    timeout=60.0,
                )
                text = r.text or ""
                log.info(
                    "fingerprint capture response: HTTP %s body=%s",
                    r.status_code,
                    text[:400],
                )
                m = re.search(r"<fingerData>([^<]+)</fingerData>", text)
                if not m:
                    data = self._parse(r)
                    detail = self._friendly_error(data, r, "не получен отпечаток")
                    if "invalidoperation" in detail.lower() or "notSupport" in detail:
                        detail = (
                            f"Захват не удался: {detail}. Возможно вы не успели "
                            "приложить палец, или устройство занято. Попробуйте снова."
                        )
                    return EnrollResult(success=False, detail=detail)
                finger_data = m.group(1)
                qm = re.search(r"<fingerPrintQuality>(\d+)</fingerPrintQuality>", text)
                quality = int(qm.group(1)) if qm else 0
                log.info(
                    "fingerprint captured: %d chars, quality=%d",
                    len(finger_data),
                    quality,
                )
        except Exception as e:
            return EnrollResult(success=False, detail=f"Захват: {e}"[:200])

        # --- Шаг 2: сохранение (ОТДЕЛЬНЫЙ клиент — иначе httpx digest не делает retry) ---
        async def _save(emp_id_str: str) -> tuple[bool, str, dict, int]:
            save_body = {
                "FingerPrintCfg": {
                    "employeeNo": emp_id_str,
                    "enableCardReader": [1],
                    "fingerPrintID": finger_no,
                    "fingerType": "normalFP",
                    "fingerData": finger_data,
                }
            }
            log.info("fingerprint step 2: download for employeeNo=%s", emp_id_str)
            async with self._client() as c2:
                rs = await c2.post(
                    "/ISAPI/AccessControl/FingerPrintDownload?format=json",
                    json=save_body,
                    timeout=30.0,
                )
                sdata = self._parse(rs)
                ok_, detail_ = self._success(sdata)
                log.info(
                    "fingerprint save response: HTTP %s ok=%s detail=%s",
                    rs.status_code,
                    ok_,
                    detail_,
                )
                return ok_, detail_, sdata, rs.status_code

        try:
            ok, detail, sdata, status_code = await _save(str(external_id))
            stripped = str(external_id).lstrip("0") or "0"
            if not ok and stripped != str(external_id):
                log.info("retry fingerprint save with stripped id: %s", stripped)
                ok, detail, sdata, status_code = await _save(stripped)

            if not ok:
                fake_r = type("R", (), {"status_code": status_code, "text": ""})()
                return EnrollResult(
                    success=False,
                    detail=self._friendly_error(sdata, fake_r, detail),
                )
            return EnrollResult(
                success=True,
                detail=f"OK · отпечаток #{finger_no} сохранён (качество {quality})",
                value_ref=f"FP-{finger_no}",
            )
        except Exception as e:
            return EnrollResult(success=False, detail=f"Сохранение: {e}"[:200])

    async def capture_face(self, external_id: str) -> EnrollResult:
        """Удалённый запуск сканирования лица камерой устройства.

        По capabilities DS-K1T343 V4.48: isSupportCaptureFace=true.
        Корректный endpoint: /ISAPI/AccessControl/CaptureFace (XML body).
        """
        xml_body = (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<CaptureInfoCond version="2.0" '
            f'xmlns="http://www.isapi.org/ver20/XMLSchema">'
            f"<employeeNo>{external_id}</employeeNo>"
            f"</CaptureInfoCond>"
        )

        async def _try(method: str, path: str, *, xml: bool, json_body: dict | None = None):
            async with self._client() as c:
                if xml:
                    r = await c.request(
                        method,
                        path,
                        headers={"Content-Type": "application/xml"},
                        content=xml_body,
                        timeout=90.0,
                    )
                else:
                    r = await c.request(method, path, json=json_body, timeout=90.0)
                return r, self._parse(r)

        last_r = None
        last_data: dict = {}
        last_detail = ""
        try:
            for method, path, xml, json_body in (
                ("POST", "/ISAPI/AccessControl/CaptureFace", True, None),
                ("POST", "/ISAPI/AccessControl/CaptureFace?format=json", False,
                    {"CaptureInfoCond": {"employeeNo": str(external_id)}}),
                ("POST", "/ISAPI/AccessControl/CaptureFaceData", True, None),
            ):
                last_r, last_data = await _try(method, path, xml=xml, json_body=json_body)
                ok, last_detail = self._success(last_data)
                if ok:
                    return EnrollResult(
                        success=True,
                        detail="OK · посмотрите в камеру устройства",
                        value_ref=f"FACE-{external_id}",
                    )
                # если 404 — endpoint неверный, идём дальше
                if last_r.status_code == 404:
                    continue
                # если иная ошибка от ISAPI — она содержательная, прерываемся
                break

            return EnrollResult(
                success=False,
                detail=self._friendly_error(last_data, last_r, last_detail)
                if last_r is not None
                else "Не удалось обратиться к устройству",
            )
        except Exception as e:
            return EnrollResult(success=False, detail=str(e)[:200])

    async def get_snapshot(self) -> bytes | None:
        """Возвращает JPEG-снимок с камеры устройства (для live-превью)."""
        # На DS-K1T343 камера обычно channel 1
        for path in (
            "/ISAPI/Streaming/channels/1/picture",
            "/ISAPI/Streaming/channels/101/picture",
        ):
            try:
                async with self._client() as c:
                    r = await c.get(path, timeout=5.0)
                    if r.status_code == 200 and r.content and len(r.content) > 100:
                        return r.content
            except Exception as e:
                log.debug("snapshot %s failed: %s", path, e)
                continue
        return None

    async def upload_face(
        self, external_id: str, image_bytes: bytes, full_name: str = ""
    ) -> EnrollResult:
        """Загружает фото лица в библиотеку распознавания (HCFaceLibblackFD).

        На DS-K1T343 V4.48 endpoint POST /Intelligent/FDLib/FDSetUp реально
        делает face detection. httpx-multipart этой прошивкой парсится как
        methodNotAllowed, а curl -F отрабатывает. Поэтому используем
        subprocess curl — гарантировано та же форма что в работающем тесте.
        """
        face_info = {
            "faceLibType": "blackFD",
            "FDID": "1",
            "FPID": str(external_id),
        }

        # Если curl доступен (он есть в образе backend) — используем его
        curl_path = shutil.which("curl")
        if curl_path:
            return await self._upload_face_curl(curl_path, face_info, image_bytes)

        # Fallback: httpx с ручным multipart
        return await self._upload_face_httpx(face_info, image_bytes)

    async def _upload_face_curl(
        self, curl_path: str, face_info: dict, image_bytes: bytes
    ) -> EnrollResult:
        """Загрузка через subprocess curl (надёжно, как в наших ручных тестах)."""
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(image_bytes)
            tmp_path = f.name
        try:
            url = (
                f"{self.base}/ISAPI/Intelligent/FDLib/FDSetUp"
                f"?format=json&FDID=1&faceLibType=blackFD"
            )
            # Компактный JSON без пробелов — иначе curl -F может парсить криво
            face_info_compact = json.dumps(face_info, separators=(",", ":"))
            args = [
                curl_path, "-s", "-X", "PUT", "--digest",
                "-u", f"{self.conn.username}:{self.conn.password}",
                "-F", f"FaceDataRecord={face_info_compact};type=application/json",
                "-F", f"FaceImage=@{tmp_path};type=image/jpeg",
                "--connect-timeout", "10",
                "--max-time", "30",
                url,
            ]
            log.info(
                "curl upload_face FPID=%s image=%d bytes url=%s",
                face_info.get("FPID"),
                len(image_bytes),
                url,
            )
            proc = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            text = stdout.decode("utf-8", errors="replace")
            err_text = stderr.decode("utf-8", errors="replace")
            log.info(
                "curl upload_face rc=%s stdout=%r stderr=%r",
                proc.returncode,
                text[:500],
                err_text[:200],
            )
            try:
                data = json.loads(text) if text.strip().startswith("{") else self._parse_xml_text(text)
            except Exception:
                data = {}
            ok, detail = self._success(data)
            if not ok:
                fake_r = type(
                    "R", (), {"status_code": 200, "text": text[:500]}
                )()
                err_detail = self._friendly_error(data, fake_r, detail)
                # если не распознали известную ошибку — покажем сырой ответ
                if not data:
                    err_detail = f"Ответ устройства: {text[:300] or '(пусто)'}"
                return EnrollResult(success=False, detail=err_detail)
            return EnrollResult(
                success=True,
                detail=f"OK · лицо сохранено в библиотеке ({len(image_bytes)//1024} КБ)",
                value_ref=f"FACE-{face_info['FPID']}",
            )
        except Exception as e:
            return EnrollResult(success=False, detail=f"curl exception: {e}"[:300])
        finally:
            try:
                import os
                os.unlink(tmp_path)
            except OSError:
                pass

    @staticmethod
    def _parse_xml_text(text: str) -> dict:
        text = text.lstrip()
        if not text.startswith("<"):
            return {}
        try:
            root = ET.fromstring(text)
            return {_strip_ns(root.tag): _xml_to_dict(root)}
        except Exception:
            return {}

    async def _upload_face_httpx(
        self, face_info: dict, image_bytes: bytes
    ) -> EnrollResult:
        """Резервная httpx-реализация — на случай если curl недоступен."""
        boundary = "----HikBoundary7MA4YWxkTrZu0gW"
        face_json = json.dumps(face_info).encode()

        body = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="FaceDataRecord"\r\n'
            "Content-Type: application/json\r\n\r\n"
        ).encode() + face_json + (
            f"\r\n--{boundary}\r\n"
            'Content-Disposition: form-data; name="img"; filename="face.jpg"\r\n'
            "Content-Type: image/jpeg\r\n\r\n"
        ).encode() + image_bytes + (
            f"\r\n--{boundary}--\r\n"
        ).encode()

        headers = {
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
            "Expect": "",
        }
        url = "/ISAPI/Intelligent/FDLib/FDSetUp?format=json&FDID=1&faceLibType=blackFD"
        try:
            async with self._client() as c:
                last_r = None
                last_data: dict = {}
                last_detail = ""
                for method in ("POST", "PUT"):
                    last_r = await c.request(
                        method,
                        url,
                        content=body,
                        headers=headers,
                        timeout=30.0,
                    )
                    last_data = self._parse(last_r)
                    ok, last_detail = self._success(last_data)
                    if ok:
                        return EnrollResult(
                            success=True,
                            detail=f"OK · лицо сохранено в библиотеке ({len(image_bytes)//1024} КБ)",
                            value_ref=f"FACE-{face_info['FPID']}",
                        )
                    sub = str(
                        (last_data.get("ResponseStatus") or last_data).get("subStatusCode") or ""
                    ).lower()
                    # если method-проблема — пробуем другой метод
                    if "method" not in sub:
                        break

                return EnrollResult(
                    success=False,
                    detail=self._friendly_error(last_data, last_r, last_detail)
                    if last_r is not None
                    else "Request failed",
                )
        except Exception as e:
            return EnrollResult(success=False, detail=str(e)[:200])

    async def capture_card(self, external_id: str) -> EnrollResult:
        """Переводит устройство в режим считывания карты.

        На экране терминала появится «Приложите карту». Сотрудник прикладывает
        карту → её номер считывается и автоматически привязывается к employeeNo.
        """
        xml_body = (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<CaptureCardInfoCond version="2.0" '
            f'xmlns="http://www.isapi.org/ver20/XMLSchema">'
            f"<cardReaderNo>1</cardReaderNo>"
            f"<timeout>30</timeout>"
            f"</CaptureCardInfoCond>"
        )

        async def _try_xml(path: str):
            async with self._client() as c:
                r = await c.post(
                    path,
                    headers={"Content-Type": "application/xml"},
                    content=xml_body,
                    timeout=60.0,
                )
                return r, self._parse(r)

        async def _try_json(path: str):
            async with self._client() as c:
                r = await c.post(
                    path,
                    json={"CaptureCardInfoCond": {"cardReaderNo": 1, "timeout": 30}},
                    timeout=60.0,
                )
                return r, self._parse(r)

        last_r = None
        last_data: dict = {}
        last_detail = ""
        try:
            for func in (
                lambda: _try_xml("/ISAPI/AccessControl/CaptureCardInfo"),
                lambda: _try_json("/ISAPI/AccessControl/CaptureCardInfo?format=json"),
            ):
                last_r, last_data = await func()
                ok, last_detail = self._success(last_data)
                if ok:
                    # Извлечь номер карты из ответа
                    info = last_data.get("CaptureCardInfo") or last_data
                    card_no = (
                        info.get("cardNo")
                        or info.get("CardInfo", {}).get("cardNo")
                        or ""
                    )
                    if not card_no:
                        return EnrollResult(
                            success=False,
                            detail="Устройство ответило OK, но номер карты не получен",
                        )
                    # Сразу привяжем к сотруднику
                    return await self.add_card(external_id, str(card_no))
                if last_r.status_code == 404:
                    continue
                break
            return EnrollResult(
                success=False,
                detail=self._friendly_error(last_data, last_r, last_detail)
                if last_r is not None
                else "Не удалось обратиться к устройству",
            )
        except Exception as e:
            return EnrollResult(success=False, detail=str(e)[:200])

    async def set_time(self, offset_hours: int = 5) -> bool:
        """Синхронизирует время устройства с сервером.

        Формат проверен эмпирически: simple XML PUT без xmlns/version,
        с timeZone в Hikvision-формате CST±H:MM:SS (где CST-5 = UTC+5).
        Локальное время вычисляется под выбранный часовой пояс.
        """
        # Hikvision инвертирует знак: CST-5 означает UTC+5
        tz_sign = "-" if offset_hours >= 0 else "+"
        tz = f"CST{tz_sign}{abs(offset_hours)}:00:00"

        local = datetime.now(timezone.utc) + timedelta(hours=offset_hours)
        tz_suffix_sign = "+" if offset_hours >= 0 else "-"
        local_str = local.strftime(
            f"%Y-%m-%dT%H:%M:%S{tz_suffix_sign}{abs(offset_hours):02d}:00"
        )

        xml_body = (
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f"<Time>"
            f"<timeMode>manual</timeMode>"
            f"<localTime>{local_str}</localTime>"
            f"<timeZone>{tz}</timeZone>"
            f"</Time>"
        )

        try:
            async with self._client() as c:
                r = await c.put(
                    "/ISAPI/System/time",
                    headers={"Content-Type": "application/xml"},
                    content=xml_body,
                    timeout=10.0,
                )
                data = self._parse(r)
                ok, _ = self._success(data)
                if ok:
                    log.info("device time set to %s (%s)", local_str, tz)
                else:
                    log.warning("set_time non-OK response: %s", r.text[:300])
                return ok
        except Exception as e:
            log.warning("set_time exception: %s", e)
            return False

    async def ensure_24x7_schedule(self) -> bool:
        """Настраивает круглосуточное расписание доступа (шаблон №1).

        На заводских/сброшенных DS-K1T343 weekPlan и planTemplate выключены,
        из-за чего устройство отказывает всем проходам с «неверное время».
        Здесь включаем weekPlan №1 (24/7) и привязываем к нему шаблон №1.
        Идемпотентно — можно вызывать при каждом test-connection.
        """
        days = [
            "Monday", "Tuesday", "Wednesday", "Thursday",
            "Friday", "Saturday", "Sunday",
        ]
        segments = []
        for d in days:
            for i in range(1, 9):
                segments.append(
                    {
                        "week": d,
                        "id": i,
                        "enable": i == 1,
                        "TimeSegment": {
                            "beginTime": "00:00:00",
                            "endTime": "23:59:59" if i == 1 else "00:00:00",
                        },
                        "authenticationTimesEnabled": False,
                        "authenticationTimes": 0,
                    }
                )
        week_body = {"UserRightWeekPlanCfg": {"enable": True, "WeekPlanCfg": segments}}
        tmpl_body = {
            "UserRightPlanTemplate": {
                "enable": True,
                "templateName": "24-7",
                "weekPlanNo": 1,
                "holidayGroupNo": "",
            }
        }
        try:
            async with self._client() as c:
                r1 = await c.put(
                    "/ISAPI/AccessControl/UserRightWeekPlanCfg/1?format=json",
                    json=week_body,
                    timeout=15.0,
                )
                ok1, _ = self._success(self._parse(r1))
                r2 = await c.put(
                    "/ISAPI/AccessControl/UserRightPlanTemplate/1?format=json",
                    json=tmpl_body,
                    timeout=15.0,
                )
                ok2, _ = self._success(self._parse(r2))
                if ok1 and ok2:
                    log.info("24x7 schedule ensured on device %s", self.conn.ip)
                else:
                    log.warning(
                        "ensure_24x7_schedule partial: week=%s tmpl=%s", ok1, ok2
                    )
                return ok1 and ok2
        except Exception as e:
            log.warning("ensure_24x7_schedule failed: %s", e)
            return False

    async def add_card(self, external_id: str, card_no: str) -> EnrollResult:
        # Прошивка V4.48 — одиночный объект CardInfo
        body = {
            "CardInfo": {
                "employeeNo": str(external_id),
                "cardNo": str(card_no),
                "cardType": "normalCard",
            }
        }
        try:
            async with self._client() as c:
                r = await c.post(
                    "/ISAPI/AccessControl/CardInfo/Record?format=json", json=body
                )
                data = self._parse(r)
                ok, detail = self._success(data)
                if not ok:
                    return EnrollResult(
                        success=False,
                        detail=self._friendly_error(data, r, detail),
                    )
                return EnrollResult(
                    success=True,
                    detail="OK",
                    value_ref=card_no[-4:].rjust(len(card_no), "*"),
                )
        except Exception as e:
            return EnrollResult(success=False, detail=str(e)[:200])
